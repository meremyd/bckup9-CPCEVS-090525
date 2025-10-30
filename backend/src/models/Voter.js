const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const voterSchema = new mongoose.Schema(
    {
        schoolId: {
            type: Number,
            required: true,
            unique: true,
        },
        firstName: {
            type: String,
            required: true,
            trim: true,
        },
        middleName: {
            type: String,
            default: null,
            trim: true,
        },
        lastName: {
            type: String,
            required: true,
            trim: true,
        },
        sex: {
            type: String,
            enum: ["Male", "Female"],
            default: null,
            trim: true,
        },
        departmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
            required: true,
        },
        yearLevel: {
            type: Number,
            required: true, // Required for eligibility
            min: 1,
            max: 4,
            validate: {
                validator: function(v) {
                    return Number.isInteger(v) && v >= 1 && v <= 4;
                },
                message: 'Year level must be an integer between 1 and 4'
            }
        },
        email: {
            type: String,
            required: false,
            trim: true,
            lowercase: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
        },
        // Security/Recovery Fields
        otpCode: {
            type: String,
            default: null,
        },
        otpExpires: {
            type: Date,
            default: null,
        },
        otpVerified: {
            type: Boolean,
            default: false,
        },
        password: {
            type: String,
            default: null,
        },
        faceEncoding: {
            type: String, // Store URL or key, not large buffer
            default: null,
        },
        profilePicture: {
            type: String, // Store URL or key, not large buffer
            default: null,
        },
        // Status Fields
        isActive: {
            type: Boolean,
            default: true,
        },
        isRegistered: {
            type: Boolean,
            default: false,
        },
        isClassOfficer: {
            type: Boolean,
            default: false,
        },
        // Password Management Fields
        passwordCreatedAt: {
            type: Date,
            default: null,
        },
        passwordExpiresAt: {
            type: Date,
            default: null,
        },
        isPasswordActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    },
)

// --- Mongoose Middleware and Methods ---

// Indexes
// Ensure uniqueness at the database level for schoolId
voterSchema.index({ schoolId: 1 }, { unique: true, name: 'uniq_schoolId' })
// Email should be unique if present; use partial index so null/undefined values are not indexed
voterSchema.index(
    { email: 1 },
    { unique: true, partialFilterExpression: { email: { $exists: true, $ne: null } }, name: 'uniq_email' }
)
voterSchema.index({ departmentId: 1 })
voterSchema.index({ isRegistered: 1 })
voterSchema.index({ departmentId: 1, yearLevel: 1 })
voterSchema.index({ isActive: 1, isRegistered: 1 })

// Pre-save hook for password hashing and status update
voterSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }

    if (this.password) {
        // Password is set: Register the account
        this.isRegistered = true;
        this.passwordCreatedAt = new Date();
        this.passwordExpiresAt = new Date(Date.now() + 10 * 30 * 24 * 60 * 60 * 1000); // 10 months
        this.isPasswordActive = true;
        
        // Hash only if it doesn't look like a hash already
        if (!this.password.startsWith('$2')) {
            const salt = await bcrypt.genSalt(12);
            this.password = await bcrypt.hash(this.password, salt);
        }
    } else {
        // Password is null: Set as unregistered
        this.isRegistered = false;
        this.passwordCreatedAt = null;
        this.passwordExpiresAt = null;
        this.isPasswordActive = false;
    }
    next();
});

// Methods
voterSchema.methods.isPasswordExpired = function () {
    if (!this.passwordExpiresAt) return false
    return new Date() > this.passwordExpiresAt
}

voterSchema.methods.setPasswordExpiration = function () {
    this.passwordCreatedAt = new Date()
    this.passwordExpiresAt = new Date(Date.now() + 10 * 30 * 24 * 60 * 60 * 1000)
    this.isPasswordActive = true
}

voterSchema.methods.comparePassword = async function(candidatePassword) {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
}

// Virtuals
voterSchema.virtual('fullName').get(function() {
    const middle = this.middleName ? ` ${this.middleName}` : '';
    return `${this.firstName}${middle} ${this.lastName}`;
});

voterSchema.virtual('yearLevelDisplay').get(function() {
    const yearNames = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };
    return yearNames[this.yearLevel] || `${this.yearLevel} Year`;
});

// Ensure virtual fields are serialized
voterSchema.set('toJSON', { virtuals: true });
voterSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("Voter", voterSchema)