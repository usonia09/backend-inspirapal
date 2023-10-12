import { Filter, ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface ScheduleEventDoc extends BaseDoc {
  title: String;
  scheduler: ObjectId;
  time: Date;
  event?: ObjectId;
}

export default class ScheduleEventConcept {
  public readonly scheduledEvents = new DocCollection<ScheduleEventDoc>("scheduleEvent");

  async scheduleEvent(title: String, scheduler: ObjectId, time: Date) {
    const _id = await this.scheduledEvents.createOne({ title, scheduler, time });
    return { msg: "Event successfully scheduled!", event: await this.scheduledEvents.readOne({ _id }) };
  }

  async addEventOnSchedule(title: String, scheduler: ObjectId, time: Date, event: ObjectId) {
    const _id = await this.scheduledEvents.createOne({ title, scheduler, time, event });
    return { msg: "Event successfully added to schedule!", event: await this.scheduledEvents.readOne({ _id }) };
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

  async getEventByEventId(event: ObjectId) {
    return this.scheduledEvents.readMany({ event });
  }

  async getEventByScheduler(scheduler: ObjectId) {
    return this.scheduledEvents.readMany({ scheduler });
  }

  async getEvents(query: Filter<ScheduleEventDoc>) {
    const events = await this.scheduledEvents.readMany(query, {
      sort: { time: -1 },
    });
    return events;
  }

  async deleteEvents(events: ScheduleEventDoc[]) {
    events.map(async (event) => await this.cancel(event._id));
    return { msg: "Events removed from schedule!" };
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
    if (user.toString() !== event.scheduler.toString()) {
      throw new EventSchedulerNotMatchError(user, _id);
    }
  }
}

export class EventSchedulerNotMatchError extends NotAllowedError {
  constructor(
    public readonly user: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the scheduler of event {1}!", user, _id);
  }
}
