export class RequestValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RequestValidationError';
    this.status = 400;
  }
}

const requireObject = (value, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RequestValidationError(`${label} must be an object.`);
  }
};

const validateText = (value, label, maxLength, { required = false } = {}) => {
  if (typeof value !== 'string') {
    throw new RequestValidationError(`${label} must be a string.`);
  }

  const text = value.trim();
  if ((required && !text) || text.length > maxLength) {
    throw new RequestValidationError(
      `${label} must be ${required ? 'non-empty and ' : ''}at most ${maxLength} characters.`,
    );
  }
  return text;
};

export const validateQuizCreate = (input, ownerId) => {
  requireObject(input, 'Quiz');
  const title = validateText(input.title, 'title', 120, { required: true });
  const description =
    input.description === undefined
      ? ''
      : validateText(input.description, 'description', 2000);

  if (typeof ownerId !== 'string' || !ownerId.trim()) {
    throw new RequestValidationError('An ownerId is required to create a quiz.');
  }

  return { title, description, ownerId: ownerId.trim(), questions: [] };
};

export const validateQuizUpdate = (input) => {
  requireObject(input, 'Quiz');
  const update = {};

  if (Object.hasOwn(input, 'title')) {
    update.title = validateText(input.title, 'title', 120, { required: true });
  }
  if (Object.hasOwn(input, 'description')) {
    update.description = validateText(input.description, 'description', 2000);
  }
  if (!Object.keys(update).length) {
    throw new RequestValidationError('Provide a title or description to update.');
  }

  return update;
};

const validateOptions = (options) => {
  if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
    throw new RequestValidationError('A question must have between 2 and 6 options.');
  }

  return options.map((option, index) =>
    validateText(option, `option ${index + 1}`, 200, { required: true }),
  );
};

const validateCorrectOption = (index, options) => {
  if (!Number.isInteger(index) || index < 0 || index >= options.length) {
    throw new RequestValidationError('correctOptionIndex must identify one of the options.');
  }
};

export const validateQuestionCreate = (input, position) => {
  requireObject(input, 'Question');
  const prompt = validateText(input.prompt, 'prompt', 500, { required: true });
  const options = validateOptions(input.options);
  validateCorrectOption(input.correctOptionIndex, options);

  return { prompt, options, correctOptionIndex: input.correctOptionIndex, position };
};

export const validateQuestionUpdate = (input, currentQuestion) => {
  requireObject(input, 'Question');
  const update = {};
  const prompt = Object.hasOwn(input, 'prompt')
    ? validateText(input.prompt, 'prompt', 500, { required: true })
    : currentQuestion.prompt;
  const optionsChanged = Object.hasOwn(input, 'options');
  const options = optionsChanged
    ? validateOptions(input.options)
    : [...currentQuestion.options];
  let correctOptionIndex = currentQuestion.correctOptionIndex;

  if (Object.hasOwn(input, 'correctOptionIndex')) {
    correctOptionIndex = input.correctOptionIndex;
  } else if (optionsChanged) {
    const previousCorrectOption = currentQuestion.options[currentQuestion.correctOptionIndex];
    const matchingOptions = options
      .map((option, index) => (option === previousCorrectOption ? index : -1))
      .filter((index) => index !== -1);
    if (matchingOptions.length !== 1) {
      throw new RequestValidationError(
        'When changing options, keep the current correct option or provide correctOptionIndex.',
      );
    }
    [correctOptionIndex] = matchingOptions;
  }

  validateCorrectOption(correctOptionIndex, options);

  if (Object.hasOwn(input, 'prompt')) update.prompt = prompt;
  if (Object.hasOwn(input, 'options')) update.options = options;
  if (Object.hasOwn(input, 'correctOptionIndex') || optionsChanged) {
    update.correctOptionIndex = correctOptionIndex;
  }
  if (!Object.keys(update).length) {
    throw new RequestValidationError('Provide a prompt, options, or correctOptionIndex to update.');
  }

  return update;
};

export const validateQuestionOrder = (questionIds, questions) => {
  if (
    !Array.isArray(questionIds) ||
    questionIds.length !== questions.length ||
    new Set(questionIds).size !== questions.length ||
    questionIds.some((id) => !questions.some((question) => String(question._id) === id))
  ) {
    throw new RequestValidationError('questionIds must contain every quiz question ID exactly once.');
  }

  return questionIds;
};
