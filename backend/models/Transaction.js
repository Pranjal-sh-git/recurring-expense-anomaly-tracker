const mongoose = require('mongoose');

/**
 * Canonical Transaction Schema for KharchaSense
 *
 * Requirements:
 * - user: ObjectId ref User required and indexed
 * - title: required trimmed string
 * - amount: positive finite Number required
 * - category: required string compatible with existing frontend
 * - date: Date required
 * - recurring: Boolean default false
 * - timestamps: true
 * - Expose an id string in API JSON (not only _id)
 * - Preserve record ownership on updates
 */
const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
      alias: 'userId'
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      validate: {
        validator: function (v) {
          return typeof v === 'string' && v.trim().length > 0;
        },
        message: 'Title must not be empty'
      }
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      validate: {
        validator: function (v) {
          return typeof v === 'number' && !isNaN(v) && isFinite(v) && v > 0;
        },
        message: 'Amount must be a positive finite number greater than zero'
      }
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      validate: {
        validator: function (v) {
          return typeof v === 'string' && v.trim().length > 0;
        },
        message: 'Category must not be empty'
      }
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      validate: {
        validator: function (v) {
          return v instanceof Date && !isNaN(v.getTime());
        },
        message: 'Date must be a valid date'
      }
    },
    recurring: {
      type: Boolean,
      default: false
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    isAnomaly: {
      type: Boolean,
      default: false
    },
    anomalyScore: {
      type: Number,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        if (ret.user) {
          ret.userId = ret.user.toString();
        }
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        if (ret.user) {
          ret.userId = ret.user.toString();
        }
        return ret;
      }
    }
  }
);

// Compound indexes for optimal querying
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, category: 1 });

// Ensure ownership cannot be changed on update queries
transactionSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update) {
    delete update.user;
    delete update.userId;
    if (update.$set) {
      delete update.$set.user;
      delete update.$set.userId;
    }
  }
  next();
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
