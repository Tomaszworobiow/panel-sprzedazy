export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Only POST method is allowed' });
    }

    const { question, context } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Klucz API OpenAI nie jest skonfigurowany.' });
    }
    if (!question) {
        return res.status(400).json({ error: 'Pytanie jest wymagane.' });
    }

    // Przygotowujemy dane dla AI
    const systemMessage = `Jesteś pomocnym asystentem analitycznym dla właściciela pasieki. Odpowiadaj na pytania bazując WYŁĄCZNIE na poniższych danych w formacie JSON. Odpowiadaj krótko i po polsku. Dane: ${JSON.stringify(context)}`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: systemMessage },
                    { role: 'user', content: question }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenAI API Error:', errorData);
            throw new Error(errorData.error?.message || 'Błąd odpowiedzi z OpenAI');
        }

        const data = await response.json();
        const answer = data.choices[0]?.message?.content || 'Nie udało mi się znaleźć odpowiedzi.';

        res.status(200).json({ answer });

    } catch (error) {
        console.error('Błąd wywołania API:', error);
        res.status(500).json({ error: error.message });
    }
}
