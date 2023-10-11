import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Category, Comment, Connect, Friend, Post, ScheduleEvent, Upvote, User, WebSession } from "./app";
import { CommentDoc } from "./concepts/comment";
import { PostDoc, PostOptions } from "./concepts/post";
import { ScheduleEventDoc } from "./concepts/scheduleEvent";
import { UserDoc } from "./concepts/user";
import { WebSessionDoc } from "./concepts/websession";
import Responses from "./responses";

class Routes {
  @Router.get("/session")
  async getSessionUser(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await User.getUserById(user);
  }

  @Router.get("/users")
  async getUsers() {
    return await User.getUsers();
  }

  @Router.get("/users/:username")
  async getUser(username: string) {
    return await User.getUserByUsername(username);
  }

  @Router.post("/users")
  async createUser(session: WebSessionDoc, username: string, password: string) {
    WebSession.isLoggedOut(session);
    return await User.create(username, password);
  }

  @Router.patch("/users")
  async updateUser(session: WebSessionDoc, update: Partial<UserDoc>) {
    const user = WebSession.getUser(session);
    return await User.update(user, update);
  }

  @Router.delete("/users")
  async deleteUser(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    WebSession.end(session);
    return await User.delete(user);
  }

  @Router.post("/login")
  async logIn(session: WebSessionDoc, username: string, password: string) {
    const u = await User.authenticate(username, password);
    WebSession.start(session, u._id);
    return { msg: "Logged in!" };
  }

  @Router.post("/logout")
  async logOut(session: WebSessionDoc) {
    WebSession.end(session);
    return { msg: "Logged out!" };
  }

  @Router.get("/posts")
  async getPosts(author?: string) {
    let posts;
    if (author) {
      const id = (await User.getUserByUsername(author))._id;
      posts = await Post.getByAuthor(id);
    } else {
      posts = await Post.getPosts({});
    }
    return Responses.posts(posts);
  }

  @Router.post("/posts")
  async createPost(session: WebSessionDoc, content: string, label: string, options?: PostOptions) {
    const user = WebSession.getUser(session);
    await Category.categoryExist(label);
    const created = await Post.create(user, content, label, options);
    await Category.addItem((await Category.getCategoryByName(label))._id, created.id);
    return { msg: created.msg, post: await Responses.post(created.post) };
  }

  @Router.patch("/posts/:_id")
  async updatePost(session: WebSessionDoc, _id: ObjectId, update: Partial<PostDoc>) {
    const user = WebSession.getUser(session);
    await Post.isAuthor(user, _id);
    return await Post.update(_id, update);
  }

  @Router.delete("/posts/:_id")
  async deletePost(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    await Post.isAuthor(user, _id);
    const label = await Post.getPostLabel(_id);
    await Category.deleteItem((await Category.getCategoryByName(label))._id, _id);
    return Post.delete(_id);
  }

  @Router.post("/posts/:post/upvotes")
  async createUpvote(session: WebSessionDoc, post: ObjectId) {
    const user = WebSession.getUser(session);
    await Upvote.hasNotUpvoted(user, post);
    const upvote = await Upvote.upvote(user, post);
    return { msg: upvote.msg, upvote: await Responses.upvote(upvote.upvote) };
  }

  @Router.delete("/upvotes/:_id")
  async deleteUpvote(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    await Upvote.isUpvoter(user, _id);
    return Upvote.removeUpvote(_id);
  }

  @Router.get("/posts/:post/upvotes")
  async getUpvotes(post: ObjectId) {
    const upvotes = await Upvote.getUpvoteByPost(post);
    return { msg: `Post ${post} has ${await Upvote.countUpvotes(post)} upvotes:`, upvotes: await Responses.upvotes(upvotes) };
  }

  @Router.get("/friends")
  async getFriends(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await User.idsToUsernames(await Friend.getFriends(user));
  }

  @Router.post("/posts/:post/comments")
  async addComment(session: WebSessionDoc, post: ObjectId, content: string) {
    const user = WebSession.getUser(session);
    const created = await Comment.create(user, post, content);
    return { msg: created.msg, post: await Responses.comment(created.comment) };
  }

  @Router.delete("/comments/:_id")
  async deleteComment(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    await Comment.isAuthor(user, _id);
    return Comment.delete(_id);
  }

  @Router.patch("/comments/:_id")
  async updateComment(session: WebSessionDoc, _id: ObjectId, update: Partial<CommentDoc>) {
    const user = WebSession.getUser(session);
    await Comment.isAuthor(user, _id);
    return await Responses.comment((await Comment.update(_id, update)).update_version);
  }

  @Router.get("/posts/:post/comments")
  async getComments(post: ObjectId) {
    const comments = await Comment.getCommentByPost(post);
    return await Responses.comments(comments);
  }

  @Router.delete("/friends/:friend")
  async removeFriend(session: WebSessionDoc, friend: string) {
    const user = WebSession.getUser(session);
    const friendId = (await User.getUserByUsername(friend))._id;
    return await Friend.removeFriend(user, friendId);
  }

  @Router.get("/friend/requests")
  async getRequests(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await Responses.friendRequests(await Friend.getRequests(user));
  }

  @Router.post("/friend/requests/:to")
  async sendFriendRequest(session: WebSessionDoc, to: string) {
    const user = WebSession.getUser(session);
    const toId = (await User.getUserByUsername(to))._id;
    return await Friend.sendRequest(user, toId);
  }

  @Router.delete("/friend/requests/:to")
  async removeFriendRequest(session: WebSessionDoc, to: string) {
    const user = WebSession.getUser(session);
    const toId = (await User.getUserByUsername(to))._id;
    return await Friend.removeRequest(user, toId);
  }

  @Router.put("/friend/accept/:from")
  async acceptFriendRequest(session: WebSessionDoc, from: string) {
    const user = WebSession.getUser(session);
    const fromId = (await User.getUserByUsername(from))._id;
    return await Friend.acceptRequest(fromId, user);
  }

  @Router.put("/friend/reject/:from")
  async rejectFriendRequest(session: WebSessionDoc, from: string) {
    const user = WebSession.getUser(session);
    const fromId = (await User.getUserByUsername(from))._id;
    return await Friend.rejectRequest(fromId, user);
  }

  @Router.post("/categories") // creating a category adds a new field in the database thus the use of `post`
  async createCategory(name: string) {
    return await Category.create(name);
  }

  @Router.get("/categories/:name") // with GET we access all available categories in the database
  async getContent(name: string) {
    // We can then get the content of a specific category given its name
    return await Category.getCategoryByName(name);
  }

  @Router.post("/events") // `Post` is once again used here since we are adding new data (Event) to database
  async scheduleEvent(session: WebSessionDoc, title: string, time: string) {
    const user = WebSession.getUser(session);
    const date = new Date(time);
    return ScheduleEvent.schedule(title, user, date);
  }

  @Router.patch("/events/:_id") //`PATCH` is needed with the `_id` to filter out which data to update in the database
  async updateEvent(session: WebSessionDoc, _id: ObjectId, update: Partial<ScheduleEventDoc>) {
    const user = WebSession.getUser(session);
    await ScheduleEvent.canEdit(user, _id);
    if (update.time) {
      update.time = new Date(update.time);
    }
    return ScheduleEvent.editEvent(_id, update);
  }

  @Router.get("/events")
  async getEvents(host?: string, time?: string) {
    let events: ScheduleEventDoc[];
    if (time && host) {
      const date = new Date(time);
      const id = (await User.getUserByUsername(host))._id;
      events = (await ScheduleEvent.getEventByHost(id)).filter((event) => {
        return event.time.toString() === date.toString();
      });
    } else if (time) {
      const date = new Date(time);
      events = await ScheduleEvent.getEventAtTime(date);
    } else if (host) {
      const id = (await User.getUserByUsername(host))._id;
      events = await ScheduleEvent.getEventByHost(id);
    } else {
      events = await ScheduleEvent.getEvents({});
    }

    return Responses.events(events);
  }

  @Router.delete("/events/:_id")
  async cancelEvent(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    await ScheduleEvent.canEdit(user, _id);
    return ScheduleEvent.cancel(_id);
  }

  @Router.post("/connects")
  async startEvent(session: WebSessionDoc, topic: string) {
    const user = WebSession.getUser(session);
    await ScheduleEvent.schedule(topic, user, new Date());
    return Connect.create(topic, user, [user], []);
  }

  @Router.patch("/connects/join/:_id")
  async joinEvent(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    return Connect.join(_id, user);
  }

  @Router.patch("/connects/leave/:_id")
  async leaveEvent(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    return Connect.leave(_id, user);
  }

  @Router.get("/connects/:_id")
  async eventParticipants(_id: ObjectId) {
    return Connect.getParticipants(_id);
  }

  @Router.delete("/connects/end/:_id")
  async endEvent(_id: ObjectId) {
    return Connect.end(_id);
  }
}

export default getExpressRouter(new Routes());
