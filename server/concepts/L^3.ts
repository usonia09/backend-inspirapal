import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";

export interface L3Doc extends BaseDoc {
  title: string;
  host: ObjectId;
  attendants: ObjectId[];
}

export default class L3Concept {
  public readonly L3 = new DocCollection<L3Doc>("L^3");
}
