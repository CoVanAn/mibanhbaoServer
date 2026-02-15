import prisma from "../config/prisma.js";
import { NotFoundError, DatabaseError } from "../exceptions/index.js";

/**
 * Base Repository Class
 * Provides common database operations for all entities
 */
export class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  /**
   * Find a single record by ID
   */
  async findById(id, include = {}) {
    try {
      const record = await this.model.findUnique({
        where: { id },
        include,
      });

      if (!record) {
        throw new NotFoundError(`${this.model.name}`);
      }

      return record;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError(error.message);
    }
  }

  /**
   * Find all records with pagination
   */
  async findAll(options = {}) {
    try {
      const {
        where = {},
        include = {},
        orderBy = { id: "asc" },
        skip = 0,
        take = 20,
      } = options;

      const [data, total] = await Promise.all([
        this.model.findMany({
          where,
          include,
          orderBy,
          skip,
          take,
        }),
        this.model.count({ where }),
      ]);

      return {
        data,
        total,
        page: Math.floor(skip / take) + 1,
        pageSize: take,
        totalPages: Math.ceil(total / take),
      };
    } catch (error) {
      throw new DatabaseError(error.message);
    }
  }

  /**
   * Create a new record
   */
  async create(data) {
    try {
      return await this.model.create({ data });
    } catch (error) {
      throw new DatabaseError(error.message);
    }
  }

  /**
   * Update a record by ID
   */
  async update(id, data) {
    try {
      return await this.model.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error.code === "P2025") {
        throw new NotFoundError(`${this.model.name}`);
      }
      throw new DatabaseError(error.message);
    }
  }

  /**
   * Delete a record by ID
   */
  async delete(id) {
    try {
      return await this.model.delete({
        where: { id },
      });
    } catch (error) {
      if (error.code === "P2025") {
        throw new NotFoundError(`${this.model.name}`);
      }
      throw new DatabaseError(error.message);
    }
  }

  /**
   * Find one record by criteria
   */
  async findOne(where, include = {}) {
    try {
      return await this.model.findFirst({
        where,
        include,
      });
    } catch (error) {
      throw new DatabaseError(error.message);
    }
  }

  /**
   * Check if record exists
   */
  async exists(where) {
    try {
      const count = await this.model.count({ where });
      return count > 0;
    } catch (error) {
      throw new DatabaseError(error.message);
    }
  }
}
