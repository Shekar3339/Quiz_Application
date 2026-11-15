import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema(
  { questionId: { type: mongoose.Schema.Types.ObjectId, required: true }, selectedOptionIndex: { type: Number, min: 0 } },
  { _id: false },
);

const questionSnapshotSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    prompt: { type: String, required: true },
    options: { type: [String], required: true },
    correctOptionIndex: { type: Number, required: true, select: false },
    position: { type: Number, required: true },
  },
  { _id: false },
);

const attemptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    quizTitle: { type: String, required: true },
    answers: { type: [answerSchema], default: [] },
    questionSnapshot: { type: [questionSnapshotSchema], required: true, select: false },
    startedAt: { type: Date, required: true },
    deadline: { type: Date, required: true },
    submittedAt: { type: Date, default: null },
    timeTaken: { type: Number, default: 0 },
    totalQuestions: { type: Number, required: true },
    correctAnswers: { type: Number, default: 0 },
    incorrectAnswers: { type: Number, default: 0 },
    unansweredQuestions: { type: Number, default: 0 },
    obtainedMarks: { type: Number, default: 0 },
    totalMarks: { type: Number, required: true },
    percentage: { type: Number, default: 0 },
    status: { type: String, enum: ['in_progress', 'submitted', 'expired'], default: 'in_progress', index: true },
  },
  { timestamps: true, optimisticConcurrency: true },
);

attemptSchema.index({ userId: 1, quizId: 1, status: 1 });
attemptSchema.index({ userId: 1, quizId: 1 }, { unique: true, partialFilterExpression: { status: 'in_progress' } });

export default mongoose.models.Attempt || mongoose.model('Attempt', attemptSchema);
