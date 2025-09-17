import { ObjectId } from 'mongodb'

export function toObjectIdOrString(id) {
  if (!id && id !== 0) return id
  try {
    // Only coerce if it looks like a valid Mongo ObjectId
    if (typeof id === 'string' && ObjectId.isValid(id)) {
      return new ObjectId(id)
    }
  } catch {}
  return id
}

export default { toObjectIdOrString }

