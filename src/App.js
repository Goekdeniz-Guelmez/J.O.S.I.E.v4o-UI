import React, { useState, useEffect, useRef } from 'react';

const InteractionUI = () => {
  const [isVoiceMode, setIsVoiceMode] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [volume, setVolume] = useState(0);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const canvasRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (!isVoiceMode) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (isListening) {
        // Animated circle
        const radius = 50 + volume * 20;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, radius, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.filter = 'blur(10px)';
        ctx.fill();

        // Grain effect
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const noise = Math.random() * 50;
          data[i] = data[i + 1] = data[i + 2] = noise;
          data[i + 3] = 50;
        }
        ctx.putImageData(imageData, 0, 0);
      } else if (isResponding) {
        // Animated lines
        const lines = 5;
        const lineWidth = 4;
        const spacing = canvas.width / (lines + 1);
        
        for (let i = 0; i < lines; i++) {
          const x = spacing * (i + 1);
          const height = (Math.sin(Date.now() * 0.01 + i) + 1) * 50;
          
          ctx.beginPath();
          ctx.moveTo(x, canvas.height / 2 - height / 2);
          ctx.lineTo(x, canvas.height / 2 + height / 2);
          ctx.strokeStyle = 'white';
          ctx.lineWidth = lineWidth;
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isVoiceMode, isListening, isResponding, volume]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const simulateVoiceInput = () => {
    const dummyInputs = [
      "What's the weather like today?",
      "Tell me a joke",
      "What's the capital of France?",
      "How do I make pancakes?",
      "What's the meaning of life?"
    ];
    const randomInput = dummyInputs[Math.floor(Math.random() * dummyInputs.length)];
    processInput(randomInput);
  };

  const handleMicClick = () => {
    if (isListening) {
      setIsListening(false);
      setVolume(0);
      simulateVoiceInput();
    } else {
      setIsListening(true);
      simulateListening();
    }
  };

  const simulateListening = () => {
    let time = 0;
    const interval = setInterval(() => {
      setVolume(Math.random());
      time += 100;
      if (time > 3000) {
        clearInterval(interval);
        handleMicClick();
      }
    }, 100);
  };

  const processInput = async (input) => {
    setMessages(prev => [...prev, { type: 'user', content: input }]);
    setIsResponding(true);
    const llmResponse = await sendToOllama(input);
    setMessages(prev => [...prev, { type: 'assistant', content: llmResponse }]);
    setIsResponding(false);
  };

  const sendToOllama = async (text) => {
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "qwen2:0.5b",
          prompt: text,
          options: {
            num_ctx: 4096
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error communicating with Ollama:', error);
      return "I'm sorry, I encountered an error while processing your request.";
    }
  };

  const handleSendMessage = async () => {
    if (inputText.trim() === '') return;
    await processInput(inputText);
    setInputText('');
  };

  const toggleMode = () => {
    setIsVoiceMode(!isVoiceMode);
    setIsListening(false);
    setVolume(0);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100vw',
      height: '100vh',
      backgroundColor: '#1a202c',
      color: 'white'
    }}>
      <button
        onClick={toggleMode}
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          padding: '0.5rem',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          border: 'none',
          borderRadius: '9999px',
          cursor: 'pointer'
        }}
      >
        {isVoiceMode ? '💬' : '🎤'}
      </button>

      {isVoiceMode ? (
        <>
          <canvas
            ref={canvasRef}
            width={300}
            height={300}
            style={{ position: 'absolute' }}
          />
          <button
            onClick={handleMicClick}
            style={{
              zIndex: 10,
              padding: '1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '9999px',
              cursor: 'pointer'
            }}
          >
            {isListening ? '🔊' : '🎤'}
          </button>
        </>
      ) : (
        <div style={{
          width: '100%',
          maxWidth: '28rem',
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div 
            ref={chatContainerRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            {messages.map((message, index) => (
              <div 
                key={index} 
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  backgroundColor: message.type === 'user' ? '#3182ce' : '#4a5568',
                  alignSelf: message.type === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                {message.content}
              </div>
            ))}
          </div>
          <div style={{
            padding: '1rem',
            borderTop: '1px solid #4a5568'
          }}>
            <div style={{
              display: 'flex',
              gap: '0.5rem'
            }}>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  backgroundColor: '#2d3748',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: 'white'
                }}
                placeholder="Type a message..."
              />
              <button
                onClick={handleSendMessage}
                style={{
                  padding: '0.5rem',
                  backgroundColor: '#3182ce',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer'
                }}
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractionUI;