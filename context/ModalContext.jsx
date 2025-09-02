import React, { createContext, useState, useContext } from 'react';
import ContactListModal from '../components/ContactListModal'; // Import the modal component

const ModalContext = createContext();

export const useModal = () => useContext(ModalContext);

export const ModalProvider = ({ children }) => {
    const [isContactModalVisible, setContactModalVisible] = useState(false);

    const openContactModal = () => {setContactModalVisible(true);
        console.log('model open',isContactModalVisible)
    }
    const closeContactModal = () => {setContactModalVisible(false);
        console.log('model close',isContactModalVisible)
    }

    return (
        <ModalContext.Provider value={{ openContactModal,closeContactModal,isContactModalVisible }}>
            {children}
           
        </ModalContext.Provider>
    );
};
