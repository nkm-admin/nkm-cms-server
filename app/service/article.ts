import { Service } from 'egg'

interface CreateOption {
  id: number;
  userId: number;
  content: string;
  title: string;
  status?: number;
  categoryId: number;
  thumbnail: string;
  images: string;
}

export default class Article extends Service {
  private async _queryTheExistenceById(id: number) {
    const { ctx } = this
    const article = await ctx.model.Article.findByPk(id)
    if (!article) return ctx.throw(200, ctx.errorMsg.article.notExists)
  }

  public async save({ id, content, title, status = 1, categoryId, thumbnail, images }: CreateOption) {
    const { ctx } = this

    ctx.validate({
      title: 'string'
    })

    const userId = await this.app.redis.hget(ctx.request.header.token, 'id')

    const option = {
      id,
      content,
      title,
      status,
      category_id: categoryId,
      user_id: userId,
      thumbnail,
      images,
      create_time: Date.now()
    }

    if (id) delete option.create_time

    return ctx.model.Article.upsert(option)
  }

  public async getList({
    page = 1,
    limit
  }) {
    return this.ctx.model.Article.findAndCountAll({
      limit,
      offset: page,
      include: [{
        model: this.ctx.model.User,
        as: 'user',
        attributes: ['display_name']
      }, {
        model: this.ctx.model.Category,
        as: 'category',
        attributes: ['name']
      }],
      attributes: [
        'id',
        'title',
        'status',
        'is_deleted',
        'create_time',
        'category_id',
        'thumbnail'
      ],
      where: {
        is_deleted: 0
      },
      order: [['create_time', 'desc']],
      raw: true
    })
  }

  public async getDetail(id: number) {
    const article = await this.ctx.model.Article.findByPk(id, {
      attributes: [
        'id',
        'title',
        'content',
        'status',
        'is_deleted',
        'create_time',
        'category_id',
        'thumbnail',
        'images'
      ],
      include: [{
        model: this.ctx.model.User,
        as: 'user',
        attributes: ['display_name']
      }, {
        model: this.ctx.model.Category,
        as: 'category',
        attributes: ['name']
      }],
      raw: true
    })
    if (!article) return this.ctx.throw(200, this.ctx.errorMsg.article.notExists)
    return article
  }

  public async del(id: number) {
    await this._queryTheExistenceById(id)
    return this.ctx.model.Article.update({
      is_deleted: 1
    }, {
      where: {
        id
      }
    })
  }
}