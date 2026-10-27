// Серверная функция Netlify: настоящий ИИ для Кёрли.
// Ключ хранится в переменной окружения ANTHROPIC_API_KEY (Site settings → Environment variables), не в index.html.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: '' };

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 400, body: '' }; }

  const tasks = Array.isArray(body.tasks) ? body.tasks.slice(0, 50) : [];
  let messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.slice(0, 1000) }))
    .slice(-12);
  while (messages.length && messages[0].role !== 'user') messages.shift();
  if (!messages.length) return { statusCode: 400, body: '' };

  const system =
    'Ты Кёрли, дружелюбный помощник школьника в приложении ENT-killer. ' +
    'Отвечай по-русски, коротко (1-4 предложения), тепло, чуть неуклюже, но по делу. ' +
    'Помогай с самодисциплиной: подсказывай, с чего начать, разбивай задания на маленькие шаги, ' +
    'напоминай про дедлайны, подбадривай без давления. Не пиши длинные лекции и не делай домашнее задание за ученика целиком, ' +
    'лучше объясни подход. Если ученик пишет о желании навредить себе, мягко посоветуй обратиться к близкому человеку или специалисту и упомяни номер 112. ' +
    'Сейчас: ' + (body.now || '') + '. Задания ученика (JSON): ' + JSON.stringify(tasks);

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({ model: 'claude-sonnet-5-5', max_tokens: 400, system, messages })
    });
    const data = await r.json();
    const reply = (data.content || []).map(b => b.text || '').join('').trim();
    return {
      statusCode: reply ? 200 : 502,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reply })
    };
  } catch (e) {
    return { statusCode: 502, body: '' };
  }
};
