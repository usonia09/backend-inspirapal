import { Filter, ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface UpvoteDoc extends BaseDoc {
  upvoter: ObjectId;
  post: ObjectId;
}

export default class UpvoteConcept {
  public readonly upvotes = new DocCollection<UpvoteDoc>("upvotes");

  async upvote(upvoter: ObjectId, post: ObjectId) {
    const _id = await this.upvotes.createOne({ upvoter, post });
    return { msg: "you've upvoted post!", upvote: await this.upvotes.readOne({ _id }) };
  }

  async isUpvoter(upvoter: ObjectId, _id: ObjectId) {
    const upvote = await this.upvotes.readOne({ _id });
    if (!upvote) {
      throw new UpvoteNoFound(_id);
    }
    if (upvote.upvoter.toString() !== upvoter.toString()) {
      throw new UpvoteOwnerNotMatching(upvoter, _id);
    }
  }

  async removeUpvote(_id: ObjectId) {
    await this.upvotes.deleteOne({ _id });
    return { msg: "Upvote removed!" };
  }

  async getUpvotes(query: Filter<UpvoteDoc>) {
    return await this.upvotes.readMany(query);
  }

  async countUpvotes(post: ObjectId) {
    const upvotes = await this.getUpvotes(post);
    if (!upvotes) {
      return 0;
    }
    return upvotes.length;
  }
}
export class UpvoteNoFound extends NotFoundError {
  constructor(public readonly _id: ObjectId) {
    super("Upvote {0} does not exist", _id);
  }
}

export class UpvoteOwnerNotMatching extends NotAllowedError {
  constructor(
    public readonly upvoter: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the upvoter of upvote {1}!", upvoter, _id);
  }
}
