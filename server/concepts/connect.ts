import { Filter, ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface ConnectDoc extends BaseDoc {
  topic: string;
  organizer: ObjectId;
  participants: ObjectId[];
  messages: ObjectId[];
}

export default class ConnectConcept {
  public readonly connects = new DocCollection<ConnectDoc>("connect");

  async create(topic: string, organizer: ObjectId, participants: ObjectId[], messages: ObjectId[]) {
    const _id = await this.connects.createOne({ topic, organizer, messages, participants });
    return { msg: "connect successfully created!", connect: await this.connects.readOne({ _id }) };
  }

  async join(_id: ObjectId, user: ObjectId) {
    const connect = await this.connects.readOne({ _id });
    if (!connect) {
      throw new NotFoundError(`connect ${_id} does not exist`);
    }
    await this.notInConnect(connect, user);
    const participants = connect.participants;
    participants.push(user);
    await this.updateConnect(_id, { participants });
    return { msg: `${user} joined Connect ${_id}` };
  }

  async leave(_id: ObjectId, user: ObjectId) {
    const connect = await this.connects.readOne({ _id });
    if (!connect) {
      throw new NotFoundError(`Connect Event ${_id} does not exist`);
    }
    await this.InConnect(connect, user);
    const participants = connect.participants.filter((elt) => {
      return elt.toString() !== user.toString();
    });
    await this.updateConnect(_id, { participants });
    return { msg: `${user} left Connect ${_id}` };
  }

  async getConnects(query: Filter<ConnectDoc>) {
    return this.connects.readMany(query, { sort: { dateUpdated: -1 } });
  }

  private async notInConnect(connect: ConnectDoc, user: ObjectId) {
    for (const elt of connect.participants) {
      if (elt.toString() === user.toString()) {
        throw new NotAllowedError(`Already in Connect ${connect._id}`);
      }
    }
  }

  private async InConnect(connect: ConnectDoc, user: ObjectId) {
    for (const elt of connect.participants) {
      if (elt.toString() === user.toString()) {
        return;
      }
    }
    throw new NotAllowedError(`User not in Connect`);
  }

  async getConnectsByOrganizer(organizer: ObjectId) {
    return this.connects.readMany({ organizer });
  }

  async getParticipants(_id: ObjectId) {
    const connect = await this.connects.readOne({ _id });
    if (!connect) {
      throw new NotFoundError(`connect ${_id} does not exist`);
    }
    return connect.participants;
  }

  async end(_id: ObjectId) {
    await this.connects.deleteOne({ _id });
    return { msg: "Event ended!" };
  }

  private async updateConnect(_id: ObjectId, update: Partial<ConnectDoc>) {
    await this.connects.updateOne({ _id }, update);
    return { msg: "Connect updated!" };
  }
}
