const mongoose = require("mongoose")

const departmentSchema = new mongoose.Schema(
  {
    departmentCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    degreeProgram: {
      type: String,
      required: true,
      trim: true,
    },
    college: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes for better query performance
departmentSchema.index({ college: 1 })
departmentSchema.index({ degreeProgram: 1 })

// Compound index for unique combination of degree program and college
departmentSchema.index({ degreeProgram: 1, college: 1 }, { unique: true })

// Virtual for display name
departmentSchema.virtual('displayName').get(function() {
  return `${this.departmentCode} - ${this.degreeProgram}`;
});

// Ensure virtual fields are serialized
departmentSchema.set('toJSON', { virtuals: true });
departmentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("Department", departmentSchema)