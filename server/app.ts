import CategoryConcept from "./concepts/category";
import CommentConcept from "./concepts/comment";
import ConnectSpaceConcept from "./concepts/connectSpace";
import FriendConcept from "./concepts/friend";
import PostConcept from "./concepts/post";
import ScheduleEventConcept from "./concepts/scheduleEvent";
import UpvoteConcept from "./concepts/upvote";
import UserConcept from "./concepts/user";
import WebSessionConcept from "./concepts/websession";

// App Definition using concepts
export const WebSession = new WebSessionConcept();
export const User = new UserConcept();
export const Post = new PostConcept();
export const Friend = new FriendConcept();
export const Upvote = new UpvoteConcept();
export const Comment = new CommentConcept();
export const Category = new CategoryConcept();
export const ConnectSpace = new ConnectSpaceConcept();
export const ScheduleEvent = new ScheduleEventConcept();
