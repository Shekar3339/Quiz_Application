import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    prompt: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    options: {
      type: [
        {
          type: String,
          required: true,
          trim: true,
          maxlength: 200,
        },
      ],
      required: true,
      validate: {
        validator: (options) => options.length >= 2 && options.length <= 6,
        message: 'A question must have between 2 and 6 options.',
      },
    },
    correctOptionIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    position: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true },
);

questionSchema.pre('validate', function validateCorrectOption(next) {
  if (Number.isInteger(this.correctOptionIndex) && this.correctOptionIndex < this.options.length) {
    next();
    return;
  }

  this.invalidate('correctOptionIndex', 'Choose one of the question options as the correct answer.');
  next();
});

const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    ownerId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    questions: {
      type: [questionSchema],
      default: [],
    },
  },
  { timestamps: true },
);

const Quiz = mongoose.models.Quiz || mongoose.model('Quiz', quizSchema);

export default Quiz;
