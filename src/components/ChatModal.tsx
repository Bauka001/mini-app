import { useEffect } from 'react';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatModal = ({ isOpen, onClose }: ChatModalProps) => {
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [isOpen, onClose]);

  return null;
};

export default ChatModal;
