import { User } from "./app";
import { CommentDoc } from "./concepts/comment";
import { AlreadyFriendsError, FriendNotFoundError, FriendRequestAlreadyExistsError, FriendRequestDoc, FriendRequestNotFoundError } from "./concepts/friend";
import { PostAuthorNotMatchError, PostDoc } from "./concepts/post";
import { ScheduleEventDoc } from "./concepts/scheduleEvent";
import { UpvoteDoc } from "./concepts/upvote";
import { Router } from "./framework/router";

/**
 * This class does useful conversions for the frontend.
 * For example, it converts a {@link PostDoc} into a more readable format for the frontend.
 */
export default class Responses {
  /**
   * Convert CommentDoc into more readable format for frontend by converting author into username.
   */
  static async event(event: ScheduleEventDoc | null) {
    if (!event) {
      return event;
    }
    const host = await User.getUserById(event.host);
    return { ...event, host: host.username };
  }

  /**
   * Same as {@link event} but for an array of ScheduleEventDoc for improved performance.
   */
  static async events(events: ScheduleEventDoc[]) {
    const hosts = await User.idsToUsernames(events.map((event) => event.host));
    return events.map((event, i) => ({ ...event, host: hosts[i] }));
  }

  /**
   * Convert CommentDoc into more readable format for frontend by converting author into username.
   */
  static async comment(comment: CommentDoc | null) {
    if (!comment) {
      return comment;
    }
    const author = await User.getUserById(comment.author);
    return { ...comment, author: author.username };
  }

  /**
   * Same as {@link Comment} but for an array of CommentDoc for improved performance.
   */
  static async comments(comments: CommentDoc[]) {
    const authors = await User.idsToUsernames(comments.map((comment) => comment.author));
    return comments.map((comment, i) => ({ ...comment, author: authors[i] }));
  }

  /**
   * Convert UpvoteDoc into more readable format for frontend by converting upvoter into username.
   */
  static async upvote(upvote: UpvoteDoc | null) {
    if (!upvote) {
      return upvote;
    }
    const upvoter = await User.getUserById(upvote.upvoter);
    return { ...upvote, upvoter: upvoter.username };
  }

  /**
   * Same as {@link upvote} but for an array of PostDoc for improved performance.
   */
  static async upvotes(upvotes: UpvoteDoc[]) {
    const upvoters = await User.idsToUsernames(upvotes.map((upvote) => upvote.upvoter));
    return upvotes.map((upvote, i) => ({ ...upvote, upvoter: upvoters[i] }));
  }

  /**
   * Convert PostDoc into more readable format for the frontend by converting the author id into a username.
   */
  static async post(post: PostDoc | null) {
    if (!post) {
      return post;
    }
    const author = await User.getUserById(post.author);
    return { ...post, author: author.username };
  }

  /**
   * Same as {@link post} but for an array of PostDoc for improved performance.
   */
  static async posts(posts: PostDoc[]) {
    const authors = await User.idsToUsernames(posts.map((post) => post.author));
    return posts.map((post, i) => ({ ...post, author: authors[i] }));
  }

  /**
   * Convert FriendRequestDoc into more readable format for the frontend
   * by converting the ids into usernames.
   */
  static async friendRequests(requests: FriendRequestDoc[]) {
    const from = requests.map((request) => request.from);
    const to = requests.map((request) => request.to);
    const usernames = await User.idsToUsernames(from.concat(to));
    return requests.map((request, i) => ({ ...request, from: usernames[i], to: usernames[i + requests.length] }));
  }
}

Router.registerError(PostAuthorNotMatchError, async (e) => {
  const username = (await User.getUserById(e.author)).username;
  return e.formatWith(username, e._id);
});

Router.registerError(FriendRequestAlreadyExistsError, async (e) => {
  const [user1, user2] = await Promise.all([User.getUserById(e.from), User.getUserById(e.to)]);
  return e.formatWith(user1.username, user2.username);
});

Router.registerError(FriendNotFoundError, async (e) => {
  const [user1, user2] = await Promise.all([User.getUserById(e.user1), User.getUserById(e.user2)]);
  return e.formatWith(user1.username, user2.username);
});

Router.registerError(FriendRequestNotFoundError, async (e) => {
  const [user1, user2] = await Promise.all([User.getUserById(e.from), User.getUserById(e.to)]);
  return e.formatWith(user1.username, user2.username);
});

Router.registerError(AlreadyFriendsError, async (e) => {
  const [user1, user2] = await Promise.all([User.getUserById(e.user1), User.getUserById(e.user2)]);
  return e.formatWith(user1.username, user2.username);
});
