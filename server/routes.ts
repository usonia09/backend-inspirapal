import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Comment, Friend, Post, Upvote, User, WebSession } from "./app";
import { CommentDoc } from "./concepts/comment";
import { PostDoc, PostOptions } from "./concepts/post";
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
  async createPost(session: WebSessionDoc, content: string, options?: PostOptions) {
    const user = WebSession.getUser(session);
    const created = await Post.create(user, content, options);
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

  //Restful Route Outline (Comment to avoid compilation Error as function bodies are empty)

  /**
   * Category
   */

  /**

  @Router.post("/categories") // creating a category adds a new field in the database thus the use of `Post`
  async createCategory(name: string, posts: Post[]) {}

  @Router.get("/categories") // with GET we access all available categories in the database
  async getContent(name: string) {} // We can then get the content of a specific category given its name

  @Router.patch("/categories/:_id") // since adding Item adds it to an existing category, we use `PATCH`
  async addItem(_id: ObjectId, update: Partial<CategoryDoc>) {} // so we need `_id` to know which category to update.
   
  */

  /**
   *  L^3 (Live Learning Lab)
   */

  /**
  
  @Router.post("/L^3") // creating L3 adds a data to database thus `Post`
  async startL3(session: WebSessionDoc, title: string, attendants: string[]) {} // session is need to make sure that L3 is started by the host.

  @Router.get("/L^3/:_id") // getting participant is accessing data in the database without changing it thus `GET`
  async getParticipants(_id: ObjectId) {} //`_id` is used to filter out the L^3 of interest

  @Router.patch("/L^3/:_id") // updating an L^3 involve altering the state of an existing L^3 thus `PATCH`. `any`= L^3DOC
  async updateL3(session: WebSessionDoc, update: Partial<any>) {}

  @Router.delete("/L^3/:_id") // the specific route is choose allow specificity in term of which L^3 to delete
  async removeL3(session: WebSessionDoc, _id: ObjectId) {}
  
  */

  /**
   *  ScheduleEvent
   */

  /**
  
  @Router.post("/scheduleevents") // `Post` is once again used here since we are adding new data (Event) to database
  async createEvent(session: WebSessionDoc, title: string, host: string, time: Date) {}

  @Router.patch("/scheduleevents/:_id") //`PATCH` is needed with the `_id` to filter out which data to update in the database
  async updateEvent(session: WebSessionDoc, _id: ObjectId, update: Partial<ScheduleEventDoct>) {}

  @Router.get("/scheduleevents")
  async getEvents(host?: string) {}

  @Router.delete("/scheduleevents/:_id")
  async cancelEvent(session: WebSessionDoc, _id: ObjectId) {}
  
  */
}

export default getExpressRouter(new Routes());
