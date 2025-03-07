const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// MongoDB connection string
const mongoURI = 'mongodb+srv://ivan:q7InvN55@exam-app.8gu8x.mongodb.net/exam-app?retryWrites=true&w=majority';

// Connect to MongoDB Atlas
mongoose.connect(mongoURI)
  .then(() => {
    console.log('Connected to MongoDB Atlas');
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB Atlas:', err);
  });

// Define your Question Schema
const QuestionSchema = new mongoose.Schema({
  question: String,
  answers: Array,
  correctAnswers: Array,
  answerType: String,
});

const Question = mongoose.model('question', QuestionSchema);

// Serve the HTML and JavaScript for the frontend
app.get('/', (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Quiz App</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        button { margin: 5px; }
        .answer { margin: 5px 0; }
      </style>
    </head>
    <body>
      <h1 id="question-title">Question</h1>
      <div id="question-container"></div>
      <button id="submit-button">Submit</button>
      <button id="previous-button">Previous</button>
      <button id="next-button">Next</button>
      <h2>Your Score: <span id="score">0</span></h2>
      <div id="show-answer"></div>
      
      <script>
        let questions = [];
        let currentQuestionIndex = 0;
        let score = 0;
        let userAnswers = {};
        let showAnswer = false;

        function renderQuestion() {
          const questionElement = document.getElementById('question-title');
          const answersContainer = document.getElementById('question-container');

          const currentQuestion = questions[currentQuestionIndex];
          questionElement.innerText = 'Question ' + (currentQuestionIndex + 1);
          answersContainer.innerHTML = '';
          currentQuestion.answers.forEach(answer => {
            const answerElement = document.createElement('div');
            answerElement.className = 'answer';
            answerElement.innerHTML = \`
              <input type="\${currentQuestion.answerType === 'single' ? 'radio' : 'checkbox'}" name="answer" value="\${answer.id}" onchange="handleAnswerSelection(\${answer.id})">
              <label>\${answer.text}</label>
            \`;
            answersContainer.appendChild(answerElement);
          });
        }

        function handleAnswerSelection(answerId) {
          const currentAnswers = userAnswers[currentQuestionIndex] || [];
          if (currentAnswers.includes(answerId)) {
            userAnswers[currentQuestionIndex] = currentAnswers.filter(id => id !== answerId);
          } else {
            userAnswers[currentQuestionIndex] = [...currentAnswers, answerId];
          }
        }

        async function fetchQuestions() {
          const response = await fetch('/api/questions');
          questions = await response.json();
          renderQuestion();
        }

        async function handleSubmit() {
          const currentQuestion = questions[currentQuestionIndex];
          const correctAnswerIds = currentQuestion.answers
            .filter(answer => answer.isCorrect)
            .map(answer => answer.id);
          
          if (currentQuestion.answerType === 'single') {
            if (userAnswers[currentQuestionIndex]?.includes(correctAnswerIds[0])) {
              score++;
            }
          } else {
            const correctCount = userAnswers[currentQuestionIndex]?.filter(answerId => correctAnswerIds.includes(answerId)).length;
            score += correctCount || 0;
          }

          document.getElementById('score').innerText = score;
          const showAnswerContainer = document.getElementById('show-answer');
          showAnswerContainer.innerHTML = '';
          currentQuestion.answers.forEach(answer => {
            const resultElement = document.createElement('p');
            resultElement.innerText = \`\${answer.text} \${answer.isCorrect ? '(Correct)' : '(Incorrect)'}\`;
            resultElement.style.color = answer.isCorrect ? 'green' : 'red';
            showAnswerContainer.appendChild(resultElement);
          });
        }

        document.getElementById('submit-button').onclick = handleSubmit;
        document.getElementById('previous-button').onclick = () => {
          if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            renderQuestion();
          }
        };
        document.getElementById('next-button').onclick = () => {
          if (currentQuestionIndex < questions.length - 1) {
            currentQuestionIndex++;
            renderQuestion();
          }
        };

        fetchQuestions();
      </script>
    </body>
  </html>
  `);
});

// API to get random questions
app.get('/api/questions', async (req, res) => {
  try {
    const questions = await Question.aggregate([{ $sample: { size: 10 }}]);
    res.json(questions);
  } catch (error) {
    res.status(500).send('Error fetching questions: ' + error);
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  // console.log(\`Server running on port \${PORT}\`);
  console.log(`Server running on port ${PORT}`);
});