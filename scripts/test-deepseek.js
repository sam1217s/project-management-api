const axios = require('axios');
require('dotenv').config();

async function testDeepSeek() {
  try {
    console.log('🤖 Probando conexión con DeepSeek...');
    
    if (!process.env.DEEPSEEK_API_KEY) {
      console.error('❌ DEEPSEEK_API_KEY no encontrada en .env');
      return;
    }

    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'user',
          content: 'Responde solo: "DeepSeek funcionando correctamente"'
        }
      ],
      max_tokens: 50
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Respuesta:', response.data.choices[0].message.content);
    console.log('🎉 DeepSeek AI configurado correctamente!');
  } catch (error) {
    console.error('❌ Error DeepSeek:', error.response?.data || error.message);
    console.log('💡 Verifica tu DEEPSEEK_API_KEY en .env');
  }
}

testDeepSeek();