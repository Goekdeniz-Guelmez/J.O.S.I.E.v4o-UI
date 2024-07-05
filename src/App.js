import React, { useState, useEffect, useRef } from 'react';
import { Motion, spring } from 'react-motion';

const VoiceInteraction = () => {
  const [isListening, setIsListening] = useState(false);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');

  const recognitionRef = useRef(null);
  const synthesisRef = useRef(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      recognitionRef.current = new window.webkitSpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setTranscript(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (transcript) {
          sendToLLM(transcript);
        }
      };
    }

    synthesisRef.current = window.speechSynthesis;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const sendToLLM = async (text) => {
    try {
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama2',
          messages: [{ role: 'user', content: text }],
        }),
      });
      const data = await response.json();
      setResponse(data.message.content);
      speakResponse(data.message.content);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const speakResponse = (text) => {
    setIsAssistantSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setIsAssistantSpeaking(false);
    synthesisRef.current.speak(utterance);
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <Motion style={{ 
        size: spring(isAssistantSpeaking ? 240 : 200),
        blur: spring(isAssistantSpeaking ? 40 : 20)
      }}>
        {({ size, blur }) => (
          <div 
            className="relative"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(245,245,245,0.2) 0%, rgba(245,245,245,0) 70%)`,
              filter: `blur(${blur}px)`,
              transition: 'all 0.5s ease-in-out'
            }}
          >
            <button
              onClick={toggleListening}
              className="absolute inset-0 flex items-center justify-center text-white text-xl focus:outline-none"
            >
              {isListening ? 'Stop' : 'Start'}
            </button>
          </div>
        )}
      </Motion>
      {transcript && (
        <div className="absolute bottom-10 left-10 text-white">
          You said: {transcript}
        </div>
      )}
      {response && (
        <div className="absolute bottom-10 right-10 text-white">
          Assistant: {response}
        </div>
      )}
    </div>
  );
};

export default VoiceInteraction;