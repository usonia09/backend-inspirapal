import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface CommentDoc extends BaseDoc {
  author: ObjectId;
  post: ObjectId;
  content: string;
}

export default class CommentConcept {
  public readonly comments = new DocCollection<CommentDoc>("comments");

  async create(author: ObjectId, post: ObjectId, content: string) {
    const _id = await this.comments.createOne({ author, post, content });
    return { msg: "Comment successfully made!", comment: await this.comments.readOne({ _id }) };
  }

  async update(_id: ObjectId, update: Partial<CommentDoc>) {
    this.sanitizeUpdate(update);
    await this.comments.updateOne({ _id }, update);
    return { msg: "Comment successfully updated!", update_version: await this.comments.readOne({ _id }) };
  }

  async isAuthor(user: ObjectId, _id: ObjectId) {
    const comment = await this.comments.readOne({ _id });
    if (!comment) {
      throw new NotFoundError(`Comment ${_id} does not exist!`);
    }
    if (comment.author.toString() !== user.toString()) {
      throw new CommentAuthorNotMatchError(user, _id);
    }
  }

  async delete(_id: ObjectId) {
    await this.comments.deleteOne({ _id });
    return { msg: `Comment ${_id} deleted` };
  }

  async getCommentByPost(post: ObjectId) {
    return await this.comments.readMany({ post });
  }

  async getCommentByauthor(author: ObjectId) {
    return await this.comments.readMany({ author });
  }

  private sanitizeUpdate(update: Partial<CommentDoc>) {
    for (const key in update) {
      if (key !== "content") {
        throw new NotAllowedError(`Cannot update '${key}' field!`);
      }
    }
  }
}

export class CommentAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the author of comment {1}!", author, _id);
  }
}
