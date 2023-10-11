import { Filter, ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface ConnectSpaceDoc extends BaseDoc {
  topic: string;
  organizer: ObjectId;
  participants: ObjectId[];
  messages: ObjectId[];
}

export default class ConnectSpaceConcept {
  public readonly connectSpaces = new DocCollection<ConnectSpaceDoc>(" connectSpace");

  async create(topic: string, organizer: ObjectId, participants: ObjectId[], messages: ObjectId[]) {
    const _id = await this.connectSpaces.createOne({ topic, organizer, messages, participants });
    return { msg: " connectSpace successfully created!", connectSpace: await this.connectSpaces.readOne({ _id }) };
  }

  async join(_id: ObjectId, user: ObjectId, username: string) {
    const connectSpace = await this.connectSpaces.readOne({ _id });
    if (!connectSpace) {
      throw new NotFoundError(` connectSpace ${_id} does not exist`);
    }
    await this.notInConnectSpace(connectSpace, user);
    const participants = connectSpace.participants;
    participants.push(user);
    await this.updateConnectSpace(_id, { participants });
    return { msg: `${username} joined ConnectSpace with topic ${connectSpace.topic}` };
  }

  async leave(_id: ObjectId, user: ObjectId, username: string) {
    const connectSpace = await this.connectSpaces.readOne({ _id });
    if (!connectSpace) {
      throw new NotFoundError(`ConnectSpace Event ${_id} does not exist`);
    }
    await this.InConnectSpace(connectSpace, user);
    const participants = connectSpace.participants.filter((elt) => {
      return elt.toString() !== user.toString();
    });
    await this.updateConnectSpace(_id, { participants });
    return { msg: `${username} left ConnectSpace with topic ${connectSpace.topic}` };
  }

  async getConnectSpaces(query: Filter<ConnectSpaceDoc>) {
    return this.connectSpaces.readMany(query, { sort: { dateUpdated: -1 } });
  }

  private async notInConnectSpace(connectspace: ConnectSpaceDoc, user: ObjectId) {
    for (const elt of connectspace.participants) {
      if (elt.toString() === user.toString()) {
        throw new NotAllowedError(`You've already joined this ConnectSpace`);
      }
    }
  }

  private async InConnectSpace(connect: ConnectSpaceDoc, user: ObjectId) {
    for (const elt of connect.participants) {
      if (elt.toString() === user.toString()) {
        return;
      }
    }
    throw new NotAllowedError(`User not in Connect`);
  }

  async getConnectsByOrganizer(organizer: ObjectId) {
    return this.connectSpaces.readMany({ organizer });
  }

  async getParticipants(_id: ObjectId) {
    const connect = await this.connectSpaces.readOne({ _id });
    if (!connect) {
      throw new NotFoundError(`connect ${_id} does not exist`);
    }
    return connect.participants;
  }

  async addMessage(_id: ObjectId, message: ObjectId) {
    const connect = await this.connectSpaces.readOne({ _id });
    if (!connect) {
      throw new NotFoundError(`connect ${_id} does not exist`);
    }
    const messages = connect.messages;
    messages.push(message);
    await this.updateConnectSpace(_id, { messages });
    return { connectSpace: await this.connectSpaces.readOne({ _id }) };
  }

  async deleteMessage(_id: ObjectId, message: ObjectId) {
    const connect = await this.connectSpaces.readOne({ _id });
    if (!connect) {
      throw new NotFoundError(`connect ${_id} does not exist`);
    }
    const messages = connect.messages.filter((elt) => {
      return elt.toString() !== message.toString();
    });
    await this.updateConnectSpace(_id, { messages });
    return { connectSpace: await this.connectSpaces.readOne({ _id }) };
  }

  async getMessages(_id: ObjectId) {
    const connect = await this.connectSpaces.readOne({ _id });
    if (!connect) {
      throw new NotFoundError(`connect ${_id} does not exist`);
    }
    return connect.messages;
  }

  async end(_id: ObjectId) {
    await this.connectSpaces.deleteOne({ _id });
    return { msg: "Event ended!" };
  }

  private async updateConnectSpace(_id: ObjectId, update: Partial<ConnectSpaceDoc>) {
    await this.connectSpaces.updateOne({ _id }, update);
    return { msg: "Connect updated!" };
  }
}
