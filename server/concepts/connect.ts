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

  async join(_id: ObjectId, user: ObjectId, username: string) {
    const connect = await this.connects.readOne({ _id });
    if (!connect) {
      throw new NotFoundError(`connect ${_id} does not exist`);
    }
    await this.notInConnect(connect, user);
    const participants = connect.participants;
    participants.push(user);
    await this.updateConnect(_id, { participants });
    return { msg: `${username} joined Connect with topic ${connect.topic}` };
  }

  async leave(_id: ObjectId, user: ObjectId, username: string) {
    const connect = await this.connects.readOne({ _id });
    if (!connect) {
      throw new NotFoundError(`Connect Event ${_id} does not exist`);
    }
    await this.InConnect(connect, user);
    const participants = connect.participants.filter((elt) => {
      return elt.toString() !== user.toString();
    });
    await this.updateConnect(_id, { participants });
    return { msg: `${username} left Connect with topic ${connect.topic}` };
  }

  async getConnects(query: Filter<ConnectDoc>) {
    return this.connects.readMany(query, { sort: { dateUpdated: -1 } });
  }

  private async notInConnect(connect: ConnectDoc, user: ObjectId) {
    for (const elt of connect.participants) {
      if (elt.toString() === user.toString()) {
        throw new NotAllowedError(`You've already joined this Connect`);
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

  async addMessage(_id: ObjectId, message: ObjectId) {
    const connect = await this.connects.readOne({ _id });
    if (!connect) {
      throw new NotFoundError(`connect ${_id} does not exist`);
    }
    const messages = connect.messages;
    messages.push(message);
    await this.updateConnect(_id, { messages });
    return { connect: await this.connects.readOne({ _id }) };
  }

  async deleteMessage(_id: ObjectId, message: ObjectId) {
    const connect = await this.connects.readOne({ _id });
    if (!connect) {
      throw new NotFoundError(`connect ${_id} does not exist`);
    }
    const messages = connect.messages.filter((elt) => {
      return elt.toString() !== message.toString();
    });
    await this.updateConnect(_id, { messages });
    return { connect: await this.connects.readOne({ _id }) };
  }

  async getMessages(_id: ObjectId) {
    const connect = await this.connects.readOne({ _id });
    if (!connect) {
      throw new NotFoundError(`connect ${_id} does not exist`);
    }
    return connect.messages;
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
