import { Filter, ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface ScheduleEventDoc extends BaseDoc {
  title: string;
  host: ObjectId;
  time: Date;
}

export default class ScheduleEventConcept {
  public readonly scheduledEvents = new DocCollection<ScheduleEventDoc>("scheduleEvent");

  async schedule(title: string, host: ObjectId, time: Date) {
    const _id = await this.scheduledEvents.createOne({ title, host, time });
    return { msg: "Event successfully scheduled!", event: await this.scheduledEvents.readOne({ _id }) };
  }

  async cancel(_id: ObjectId) {
    await this.scheduledEvents.deleteOne({ _id });
    return { msg: "Event canceled!" };
  }
  async editEvent(_id: ObjectId, update: Partial<ScheduleEventDoc>) {
    await this.scheduledEvents.updateOne({ _id }, update);
    return { msg: "Event updated!" };
  }

  async getEventAtTime(time: Date) {
    return this.scheduledEvents.readMany({ time });
  }

  async getEventByHost(host: ObjectId) {
    return this.scheduledEvents.readMany({ host });
  }

  async getEvents(query: Filter<ScheduleEventDoc>) {
    const events = await this.scheduledEvents.readMany(query, {
      sort: { time: -1 },
    });
    return events;
  }

  async getEventTime(_id: ObjectId) {
    const event = await this.scheduledEvents.readOne({ _id });
    if (!event) {
      throw new NotFoundError(`Event ${_id} does not exist`);
    }
    return event.time;
  }

  async canEdit(user: ObjectId, _id: ObjectId) {
    const event = await this.scheduledEvents.readOne({ _id });
    if (!event) {
      throw new NotFoundError(`Event ${_id} does not exist`);
    }
    if (user.toString() !== event.host.toString()) {
      throw new EventHostNotMatchError(user, _id);
    }
  }
}

export class EventHostNotMatchError extends NotAllowedError {
  constructor(
    public readonly user: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the host of event {1}!", user, _id);
  }
}
