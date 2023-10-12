import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Category, Comment, ConnectSpace, Friend, Post, ScheduleEvent, Upvote, User, WebSession } from "./app";
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
    const post_ids = (await Post.getByAuthor(user)).map((post) => post._id);
    post_ids.map(async (id) => await Post.delete(id));
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
      posts = await Post.getPosts({ author: id, label: { $exists: true } });
    } else {
      posts = await Post.getPosts({ label: { $exists: true } });
    }
    return Responses.posts(posts);
  }

  @Router.post("/posts")
  async createPost(session: WebSessionDoc, content: string, label: string, options?: PostOptions) {
    const user = WebSession.getUser(session);
    await Category.categoryExist(label);
    const created = await Post.createPost(user, content, label, options);
    await Category.addItem((await Category.getCategoryByName(label))._id, created.id);

    return { msg: created.msg, post: await Responses.post(created.post) };
  }

  @Router.patch("/posts/:_id")
  async updatePost(session: WebSessionDoc, _id: ObjectId, update: Partial<PostDoc>) {
    const user = WebSession.getUser(session);
    const post_label = await Post.getPostLabel(_id);
    await Post.isAuthor(user, _id);
    if (post_label && update.label && post_label !== update.label) {
      const new_category = (await Category.getCategoryByName(update.label))._id;
      await Category.addItem(new_category, _id);
      await Category.deleteItem((await Category.getCategoryByName(post_label))._id, _id);
    }

    return await Post.update(_id, update);
  }

  @Router.delete("/posts/:_id")
  async deletePost(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    await Post.isAuthor(user, _id);
    const label = await Post.getPostLabel(_id);
    if (label) {
      await Category.deleteItem((await Category.getCategoryByName(label))._id, _id);
    }
    const comment_ids = (await Comment.getCommentByPost(_id)).map((comment) => comment._id);
    comment_ids.map(async (id) => await Comment.delete(id));
    return Post.delete(_id);
  }

  @Router.post("/posts/:post/upvotes")
  async createUpvote(session: WebSessionDoc, post: ObjectId) {
    const user = WebSession.getUser(session);
    await Upvote.hasNotUpvoted(user, post);
    await Upvote.upvote(user, post);
    const post_ids = (await Post.getPosts({ label: { $exists: true } })).map((post) => post._id);
    const orderedPost = await Upvote.reorder(post_ids);
    return Responses.feeds(await Post.getPostsByIds(orderedPost));
  }

  @Router.delete("/upvotes/:_id")
  async deleteUpvote(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    await Upvote.isUpvoter(user, _id);
    await Upvote.removeUpvote(_id);
    const post_ids = (await Post.getPosts({ label: { $exists: true } })).map((post) => post._id);
    const orderedPost = await Upvote.reorder(post_ids);
    return Responses.feeds(await Post.getPostsByIds(orderedPost));
  }

  @Router.get("/posts/:post/upvotes")
  async getUpvotes(post: ObjectId) {
    const upvotes = await Upvote.getUpvoteByPost(post);
    return { msg: `Post ${post} has ${await Upvote.countUpvotes(post)} upvotes:`, upvoters: await Responses.upvoters(upvotes) };
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
    const comment_ids = (await Comment.getCommentByPost(_id)).map((comment) => comment._id);
    comment_ids.map(async (id) => await Comment.delete(id));
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

  @Router.post("/categories")
  async createCategory(name: string) {
    return await Category.create(name);
  }

  @Router.get("/categories/:name")
  async getContent(category_name: string) {
    const items = (await Category.getCategoryByName(category_name)).items;
    const content = await Post.getPostsByIds(items);
    return { category: category_name, content: await Responses.posts(content) };
  }

  @Router.post("/events")
  async scheduleEvent(session: WebSessionDoc, title: string, time: string) {
    const user = WebSession.getUser(session);
    return ScheduleEvent.scheduleEvent(title, user, new Date(time));
  }

  @Router.patch("/events/:_id")
  async updateEvent(session: WebSessionDoc, _id: ObjectId, update: Partial<ScheduleEventDoc>) {
    const user = WebSession.getUser(session);
    await ScheduleEvent.canEdit(user, _id);
    if (update.time) {
      update.time = new Date(update.time);
    }
    return ScheduleEvent.editEvent(_id, update);
  }

  @Router.get("/events")
  async getEvents(scheduler?: string, time?: string) {
    let events: ScheduleEventDoc[];
    if (time && scheduler) {
      const date = new Date(time);
      const id = (await User.getUserByUsername(scheduler))._id;
      events = (await ScheduleEvent.getEventByScheduler(id)).filter((event) => {
        return event.time.toString() === date.toString();
      });
    } else if (time) {
      const date = new Date(time);
      events = await ScheduleEvent.getEventAtTime(date);
    } else if (scheduler) {
      const id = (await User.getUserByUsername(scheduler))._id;
      events = await ScheduleEvent.getEventByScheduler(id);
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

  @Router.post("/connectspaces")
  async startEvent(session: WebSessionDoc, topic: string) {
    const user = WebSession.getUser(session);
    const event = (await ConnectSpace.create(topic, user, [user], [])).connectSpace;
    if (event) {
      await ScheduleEvent.addEventOnSchedule(event.topic, user, new Date(), event._id);
    }
    return Responses.connectSpace(event);
  }

  @Router.patch("/connectspaces/:connectspace/add-message")
  async sendMessage(session: WebSessionDoc, connectSpace_id: ObjectId, message: string) {
    const user = WebSession.getUser(session);
    const created = await Post.createMessage(user, message);
    return Responses.connectSpace((await ConnectSpace.addMessage(connectSpace_id, created.id, user)).connectSpace);
  }

  @Router.patch("/connectspaces/:connectspace/delete-message")
  async deleteMessage(session: WebSessionDoc, connectSpace_id: ObjectId, message_id: ObjectId) {
    const user = WebSession.getUser(session);
    await Post.isAuthor(user, message_id);
    await Post.delete(message_id);
    return Responses.connectSpace((await ConnectSpace.deleteMessage(connectSpace_id, message_id)).connectSpace);
  }

  @Router.patch("/connectspaces/join/:_id")
  async joinEvent(session: WebSessionDoc, connectSpace_id: ObjectId) {
    const user = WebSession.getUser(session);
    await ConnectSpace.join(connectSpace_id, user);
    return { msg: `${user} joined!`, connect: await Responses.connectSpace(await ConnectSpace.getConnectSpaceById(connectSpace_id)) };
  }

  @Router.patch("/connectspaces/leave/:_id")
  async leaveEvent(session: WebSessionDoc, connectSpace_id: ObjectId) {
    const user = WebSession.getUser(session);
    return ConnectSpace.leave(connectSpace_id, user);
  }

  @Router.get("/connectspaces/:_id")
  async eventParticipants(connectSpace_id: ObjectId) {
    const participants_ids = await ConnectSpace.getParticipants(connectSpace_id);
    return User.idsToUsernames(participants_ids);
  }

  @Router.delete("/connectspaces/end/:_id")
  async endEvent(session: WebSessionDoc, connectSpace_id: ObjectId) {
    const user = WebSession.getUser(session);
    await ConnectSpace.isOrganizer(connectSpace_id, user);
    const events = await ScheduleEvent.getEventByEventId(connectSpace_id);
    await ScheduleEvent.deleteEvents(events);
    return ConnectSpace.end(connectSpace_id);
  }
}

export default getExpressRouter(new Routes());
