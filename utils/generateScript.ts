export async function generateScriptFromPrompt(userPrompt: string) {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer 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",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful creative writer that turns short ideas into visual storytelling scripts."
          },
          {
            role: "user",
            content: `Create a short visual script based on this idea: "${userPrompt}". Break it into 5-10 short lines that can match images.`
          }
        ],
        temperature: 0.9
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to generate script');
    }

    const data = await response.json();

    if (!data.choices || !data.choices.length) {
      throw new Error("Failed to get a valid response from OpenRouter.");
    }

    return data.choices[0].message.content;
  } catch (error: any) {
    console.error('Script generation error:', error);
    throw new Error(error.message || 'Failed to generate script');
  }
} 