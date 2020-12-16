const Joi = require('joi');
const db = require('../db');

const { RecordNotFoundError, ValidationError } = require('../error-types');
const definedAttributesToSqlSet = require('../helpers/definedAttributesToSQLSet.js');

const getArticles = async () => {
  return db.query('SELECT * FROM article');
};

const getOneArticle = async (id, failIfNotFound = true) => {
  const rows = await db.query('SELECT * FROM article WHERE id = ?', [id]);
  if (rows.length) {
    return rows[0];
  }
  if (failIfNotFound) throw new RecordNotFoundError('articles', id);
  return null;
};

const removeArticle = async (id, failIfNotFound = true) => {
  const res = await db.query('DELETE FROM article WHERE id = ?', [id]);
  if (res.affectedRows !== 0) {
    return true;
  }
  if (failIfNotFound) throw new RecordNotFoundError('article', id);
  return false;
};

const validate = async (attributes, options = { udpatedRessourceId: null }) => {
  const { udpatedRessourceId } = options;
  const forUpdate = !!udpatedRessourceId;
  // Creation du schema pour la validation via Joi
  const schema = Joi.object().keys({
    title: forUpdate
      ? Joi.string().min(0).max(150)
      : Joi.string().min(0).max(150).required(),
    content: forUpdate ? Joi.string() : Joi.string().required(),
    url: forUpdate
      ? Joi.string().min(0).max(150)
      : Joi.string().min(0).max(150).required(),
    created_at: forUpdate ? Joi.any() : Joi.date().required(),
    updated_at: forUpdate ? Joi.date().required() : Joi.any(),
  });

  const { error } = schema.validate(attributes, {
    abortEarly: false,
  });
  if (error) throw new ValidationError(error.details);
};

// this whole function returns either true or false depending on whether the data is ok or not
const validateTags = async (tagsArray) => {
  let validation = true;
  const schema = Joi.array().items(Joi.number().integer());
  const { error } = schema.validate(tagsArray, {
    abortEarly: false,
  });
  if (error) {
    validation = false;
  }
  // throw new ValidationError(error.details);

  const rawData = await db.query('SELECT id FROM tag');
  const validIds = rawData.map((obj) => obj.id);
  tagsArray.forEach((idToValidate) => {
    if (validIds.includes(idToValidate) === false) {
      validation = false;
      // throw new RecordNotFoundError('tag', idToValidate);
    }
  });

  return validation;
};

const linkArticleToTags = async (articleId, tagsArray) => {
  if (tagsArray.length > 0) {
    const tagValidation = await validateTags(tagsArray);
    let valuePairsString = '';
    tagsArray.forEach((tag) => {
      valuePairsString += `(${+articleId}, ${+tag}),`; // + to convert it to number or make sure it's a number
    });
    valuePairsString = valuePairsString.slice(0, -1); // removing the last comma

    const result = await db
      .query(
        `INSERT INTO tagToArticle (article_id, tag_id) VALUES ${valuePairsString};`
      )
      .catch(() => {
        return false;
      });

    if (!tagValidation || result === false) {
      removeArticle(articleId);
      throw new ValidationError([
        {
          message:
            'there was a problem to link the article to its tags, the article was removed',
          path: ['tagToArticle'],
          type: 'insertionError',
        },
      ]);
    }
  }
};

const createArticle = async (newAttributes) => {
  await validate(newAttributes);
  return db
    .query(
      `INSERT INTO article SET ${definedAttributesToSqlSet(newAttributes)}`,
      newAttributes
    )
    .then((res) => getOneArticle(res.insertId));
};

const updateArticle = async (id, newAttributes) => {
  await validate(newAttributes, { udpatedRessourceId: id });
  const namedAttributes = definedAttributesToSqlSet(newAttributes);
  return db
    .query(`UPDATE article SET ${namedAttributes} WHERE id = :id`, {
      ...newAttributes,
      id,
    })
    .then(() => getOneArticle(id));
};

module.exports = {
  getArticles,
  getOneArticle,
  createArticle,
  linkArticleToTags,
  updateArticle,
  removeArticle,
};
