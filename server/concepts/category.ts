import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { BadValuesError, NotAllowedError, NotFoundError } from "./errors";

export interface CategoryDoc extends BaseDoc {
  name: string;
  items: ObjectId[];
}

export default class CategoryConcept {
  public readonly categories = new DocCollection<CategoryDoc>("categories");

  async create(name: string) {
    await this.canCreateCategory(name);
    const items: ObjectId[] = [];
    const _id = await this.categories.createOne({ name, items });
    return { msg: `Category was created successfully!`, category: await this.categories.readOne({ _id }) };
  }

  private async updateCategory(_id: ObjectId, update: Partial<CategoryDoc>) {
    this.sanitizeUpdate(update);
    await this.categories.updateOne({ _id }, update);
    return { msg: "Updated category content!", updated_category: await this.categories.readOne({ _id }) };
  }

  async getCategoryByName(name: string) {
    const category = await this.categories.readOne({ name });
    if (category == null) {
      throw new NotFoundError("Category not Found");
    }
    return category;
  }

  async getCategoryById(_id: ObjectId) {
    const category = await this.categories.readOne({ _id });
    if (category == null) {
      throw new NotFoundError("Category not Found");
    }
    return category;
  }

  async categoryExist(name: string) {
    const category = await this.categories.readOne({ name });
    if (!category) {
      return (await this.create(name)).category?._id;
    }
    return category._id;
  }

  async addItem(_id: ObjectId, post: ObjectId) {
    const category = await this.categories.readOne({ _id });
    if (!category) {
      throw new NotFoundError(`Category ${_id} does not exist.`);
    }
    const items = category.items;
    items.push(post);
    await this.updateCategory(_id, { items });
    return { msg: "Item successfully added!" };
  }

  async deleteItem(_id: ObjectId, post: ObjectId) {
    const category = await this.categories.readOne({ _id });
    if (!category) {
      throw new NotFoundError(`Category ${_id} does not exist.`);
    }
    const items = category.items.filter((elt) => {
      return elt.toString() !== post.toString();
    });
    await this.updateCategory(_id, { items });
    return { msg: "Item successfully deleted!" };
  }

  private async isCategoryNameUnique(name: string) {
    if (await this.categories.readOne({ name })) {
      throw new NotAllowedError(`Category ${name} already exist`);
    }
  }

  private async canCreateCategory(name: string) {
    if (!name) {
      throw new BadValuesError("Label cannot be empty.");
    }
    await this.isCategoryNameUnique(name);
  }

  private sanitizeUpdate(update: Partial<CategoryDoc>) {
    for (const key in update) {
      if (key !== "items") {
        throw new NotAllowedError(`Cannot update '${key}' field!`);
      }
    }
  }
}
