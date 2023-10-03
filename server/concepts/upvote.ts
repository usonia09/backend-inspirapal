import { Filter, ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotFoundError } from "./errors";

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

  async hasUpvote(upvoter: ObjectId, post: ObjectId) {
    const upvoted = await this.upvotes.readOne({ upvoter, post });
    if (!upvoted) {
      throw new HasNotUpvoted(upvoter, post);
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
    if (upvotes == null) {
      throw new PostNotFound(post);
    }
    return upvotes.length;
  }
}

export class PostNotFound extends NotFoundError {
  constructor(public readonly post: ObjectId) {
    super("Cannot upvote non-existing post {0}", post);
  }
}

export class HasNotUpvoted extends NotFoundError {
  constructor(
    public readonly upvoter: ObjectId,
    public readonly post: ObjectId,
  ) {
    super("user {0} has no upvote on post {1}", post);
  }
}
