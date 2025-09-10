const mongoose = require("mongoose")

const degreeSchema = new mongoose.Schema(
  {
    degreeCode: {
      type: String,
      required: true,
      uppercase: true,
    },
    degreeName: {
      type: String,
      required: true,
      // Remove unique constraint from degreeName to avoid conflicts
    },
    department: {
      type: String,
      required: true,
    },
    major: {
      type: String,
      default: null, // For BSED majors (English, Science)
    },
  },
  {
    timestamps: true,
  },
)

// Single compound index to ensure unique combination of degreeCode + major
// This handles cases like "BSED - Science" vs "BSED - English"
degreeSchema.index({ degreeCode: 1, major: 1 }, { unique: true })

// Add a virtual field for display name that combines code and major
degreeSchema.virtual('displayName').get(function() {
  if (this.major) {
    return `${this.degreeCode} - ${this.major}`;
  }
  return this.degreeCode;
});

// Pre-save validation to ensure degreeName uniqueness manually
degreeSchema.pre('save', async function(next) {
  // Check for duplicate degreeName
  const existingDegree = await this.constructor.findOne({
    degreeName: this.degreeName,
    _id: { $ne: this._id } // Exclude current document if updating
  });
  
  if (existingDegree) {
    const error = new Error('Degree name must be unique');
    error.statusCode = 400;
    return next(error);
  }
  
  next();
});

module.exports = mongoose.model("Degree", degreeSchema)