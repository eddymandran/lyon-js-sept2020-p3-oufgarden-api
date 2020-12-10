const Joi = require('joi');
const db = require('../db');
const { RecordNotFoundError, ValidationError } = require('../error-types');
const definedAttributesToSqlSet = require('../helpers/definedAttributesToSQLSet.js');

// const emailAlreadyExists = async (email) => {
//   const rows = await db.query('SELECT * FROM user WHERE email = ?', [email]);
//   if (rows.length) {
//     return true;
//   }
//   return false;
// };

const getOneArticle = async (id, failIfNotFound = true) => {
  const rows = await db.query('SELECT * FROM article WHERE id = ?', [id]);
  if (rows.length) {
    return rows[0];
  }
  if (failIfNotFound) throw new RecordNotFoundError('articles', id);
  return null;
};

const validate = async (attributes, options = { udpatedRessourceId: null }) => {
  const { udpatedRessourceId } = options;
  // eslint-disable-next-line no-unused-vars
  const forUpdate = !!udpatedRessourceId;
  // Creation du schema pour la validation via Joi
  const schema = Joi.object().keys({
    title: Joi.string().min(0).max(150).required(),
    content: Joi.string(),
    url: Joi.string().min(0).max(150).required(),
    created_at: Joi.date().required(),
  });

  const { error } = schema.validate(attributes, {
    abortEarly: false,
  });
  if (error) throw new ValidationError(error.details);
  // if (attributes.email) {
  //   let shouldThrow = false;
  //   if (forUpdate) {
  //     const toUpdate = await getOneUser(udpatedRessourceId);
  //     shouldThrow =
  //       !(toUpdate.email === attributes.email) &&
  //       (await emailAlreadyExists(attributes.email));
  //   } else {
  //     shouldThrow = await emailAlreadyExists(attributes.email);
  //   }
  //   if (shouldThrow) {
  //     throw new ValidationError([
  //       { message: 'email_taken', path: ['email'], type: 'unique' },
  //     ]);
  //   }
  // }
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

const getArticles = async () => {
  return db.query('SELECT * FROM article');
};

// const updateUser = async (id, newAttributes) => {
//   await validate(newAttributes, { udpatedRessourceId: id });
//   const namedAttributes = definedAttributesToSqlSet(newAttributes);
//   return db
//     .query(`UPDATE user SET ${namedAttributes} WHERE id = :id`, {
//       ...newAttributes,
//       id,
//     })
//     .then(() => getOneUser(id));
// };
// const removeUser = async (id, failIfNotFound = true) => {
//   const res = await db.query('DELETE FROM user WHERE id = ?', [id]);
//   if (res.affectedRows !== 0) {
//     return true;
//   }
//   if (failIfNotFound) throw new RecordNotFoundError('contacts', id);
//   return false;
// };

module.exports = {
  getArticles,
  getOneArticle,
  createArticle,
  // updateUser, removeUser
};
