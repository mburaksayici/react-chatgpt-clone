import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
} from "react";
import { BiPlus, BiUser, BiSend, BiSolidUserCircle } from "react-icons/bi";
import { MdOutlineArrowLeft, MdOutlineArrowRight } from "react-icons/md";

function App() {
  const [text, setText] = useState("");
  const [message, setMessage] = useState(null);
  const [previousChats, setPreviousChats] = useState([]);
  const [localChats, setLocalChats] = useState([]);
  const [currentTitle, setCurrentTitle] = useState(null);
  const [isResponseLoading, setIsResponseLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [isShowSidebar, setIsShowSidebar] = useState(false);
  const scrollToLastItem = useRef(null);
  const [userId, setUserId] = useState("admin"); // Assuming static user ID for now
  const [conversationId, setConversationId] = useState(""); // State to store conversation ID
  const [selectedConversationId, setSelectedConversationId] = useState(false); // New state to store selected chat's conversationId

  // Function to initialize conversation
  const initializeConversation = () => {
    return fetch("http://localhost:8080/admin/initialise_conversation/", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "user-id": userId, // Pass the user ID header
      },
    })
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to initialize conversation");
      }
      return response.json();
    })
    .then(data => {
      console.log(data);
      console.log("userId:", userId);
      console.log("conversationId:", data.conversation_id); // Log the updated conversation ID
      setConversationId(data.conversation_id); // Store the conversation ID
    })
    .catch(error => {
      console.error("Error initializing conversation:", error);
    });
  };  // useEffect(() => {
  //initializeConversation(); // Initialize conversation when component mounts
  //}, []); // Empty dependency array to run only once

  const createNewChat = () => {
    setMessage(null);
    setText("Give me financial report that helps me invest to Tesla, on the emphasis of electric vehicles. Use stock data, documents that you have, cite all your sources, along with why you have chosen these sources and what questions make you search for those resources.");
    setSelectedConversationId(false);
    setCurrentTitle(null);
  };

  const backToHistoryPrompt = (uniqueTitle) => {
    setCurrentTitle(uniqueTitle);
    setMessage(null);
    setText("");
  };

  const toggleSidebar = useCallback(() => {
    setIsShowSidebar((prev) => !prev);
  }, []);

  const submitHandler = async (e) => {
    e.preventDefault();
    if (!text) return;
    setIsResponseLoading(true);
    setErrorText("");

    let convId = ''; // Initialize convId

    if (!selectedConversationId) {
      // Hit the API endpoint only if selectedConversationId is not set
      const response = await fetch("http://localhost:8080/admin/initialise_conversation/", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "user-id": userId,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to initialize conversation");
      }
  
      const data = await response.json();
      convId = data.conversation_id;
    } else {
      // If selectedConversationId is already set, use it
      convId = selectedConversationId;

    }
    setConversationId(convId);
    setSelectedConversationId(convId);

    const options = {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    };
  
    try {
      console.log("userId after init :", userId);
      console.log("conversationId after init:", conversationId);
  
      const response = await fetch(
        `http://localhost:8080/admin/conversation/?query=${encodeURIComponent(text)}&conversation_id=${convId}&user_id=${userId}`,
        options
      );
  
      if (response.status === 429) {
        return setErrorText("Too many requests, please try again later.");
      }
  
      const data = await response.json();
      data.conversation_id = convId
      console.log("apiresponse:", data);
      if (data.error) {
        setErrorText(data.error.message);
        setText("");
      } else {
        setErrorText(false);
      }
  
      if (!data.error) {
        setErrorText("");
        setMessage(data);
        console.log(data);
        setTimeout(() => {
          scrollToLastItem.current?.lastElementChild?.scrollIntoView({
            behavior: "smooth",
          });
        }, 1);
        setTimeout(() => {
          setText("");
        }, 200);
      }
    } catch (e) {
      setErrorText(e.message);
      console.error(e);
    } finally {
      setIsResponseLoading(false);
    }
  };
  


  useLayoutEffect(() => {
    const handleResize = () => {
      setIsShowSidebar(window.innerWidth <= 640);
    };
    handleResize();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const storedChats = localStorage.getItem("previousChats");
    console.log("storedchats:",storedChats);
    if (storedChats) {
      setLocalChats(JSON.parse(storedChats));
    }
  }, []);

  useEffect(() => {
    if (!currentTitle && text && message) {
      setCurrentTitle(text);
    }

    if (currentTitle && text && message) {
      const newChat = {
        title: currentTitle,
        role: "user",
        content: text,
        conversation_id: selectedConversationId || message.conversation_id,


      };
      console.log("newchat:",newChat);

      const responseMessage = {
        title: currentTitle,
        role: message.role,
        content: message.content,
        conversation_id: selectedConversationId || message.conversation_id,
      };

      setPreviousChats((prevChats) => [...prevChats, newChat, responseMessage]);

      setLocalChats((prevChats) => [...prevChats, newChat, responseMessage]);

      const updatedChats = [...localChats, newChat, responseMessage];
      localStorage.setItem("previousChats", JSON.stringify(updatedChats));
    }
  }, [message, currentTitle, selectedConversationId]);

  const currentChat = (localChats || previousChats).filter(
    (prevChat) => prevChat.title === currentTitle
  );

  const uniqueTitles = Array.from(
    new Set(previousChats.map((prevChat) => prevChat.title).reverse())
  );

  const localUniqueTitles = Array.from(
    new Set(localChats.map((prevChat) => prevChat.title).reverse())
  ).filter((title) => !uniqueTitles.includes(title));

  return (
    <>
      <div className="container">
        <section className={`sidebar ${isShowSidebar ? "open" : ""}`}>
          <div className="sidebar-header" onClick={createNewChat} role="button">
            <BiPlus size={20} />
            <button>New Chat</button>
          </div>
          <div className="sidebar-history">
            {uniqueTitles.length > 0 && previousChats.length !== 0 && (
              <>
                <p>Ongoing</p>
                <ul>
                  {uniqueTitles?.map((uniqueTitle, idx) => {
                    const listItems = document.querySelectorAll("li");

                    listItems.forEach((item) => {
                      if (item.scrollWidth > item.clientWidth) {
                        item.classList.add("li-overflow-shadow");
                      }
                    });

                    return (
                      <li
                        key={idx}
                        onClick={() => backToHistoryPrompt(uniqueTitle)}
                      >
                        {uniqueTitle}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            {localUniqueTitles.length > 0 && localChats.length !== 0 && (
              <>
                <p>Previous</p>
                <ul>
                  {localUniqueTitles?.map((uniqueTitle, idx) => (
                    <li
                      key={idx}
                      onClick={() => {
                        const selectedChat = localChats.find(chat => chat.title === uniqueTitle);
                        if (selectedChat) setSelectedConversationId(selectedChat.conversation_id);
                        backToHistoryPrompt(uniqueTitle);
                      }}
                    >
                      {uniqueTitle}
                    </li>
                  ))}
                </ul>
              </>
            )}

          </div>
          <div className="sidebar-info">
            <div className="sidebar-info-upgrade">
              <BiUser size={20} />
              <p>Upgrade plan</p>
            </div>
            <div className="sidebar-info-user">
              <BiSolidUserCircle size={20} />
              <p>User</p>
            </div>
          </div>
        </section>

        <section className="main">
          {!currentTitle && (
            <div className="empty-chat-container">
              <img
                src="images/chatgpt-logo.svg"
                width={60}
                height={60}
                alt="ChatGPT"
              />
              <h1>FinGPT</h1>
              <h3>How can I help you financially?</h3>
            </div>
          )}

          {isShowSidebar ? (
            <MdOutlineArrowRight
              className="burger"
              size={28.8}
              onClick={toggleSidebar}
            />
          ) : (
            <MdOutlineArrowLeft
              className="burger"
              size={28.8}
              onClick={toggleSidebar}
            />
          )}
          <div className="main-header">
            <ul>
              {currentChat?.map((chatMsg, idx) => {
                const isUser = chatMsg.role === "user";

                return (
                  <li key={idx} ref={scrollToLastItem}>
                    {isUser ? (
                      <div>
                        <BiSolidUserCircle size={28.8} />
                      </div>
                    ) : (
                      <img src="images/chatgpt-logo.svg" alt="ChatGPT" />
                    )}
                    {isUser ? (
                      <div>
                        <p className="role-title">You</p>
                        <p>{chatMsg.content}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="role-title">FinGPT</p>
                        <p style={{ whiteSpace: 'pre-line' }}>{chatMsg.content}</p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="main-bottom">
            {errorText && <p className="errorText">{errorText}</p>}
            <form className="form-container" onSubmit={submitHandler}>
              <input
                type="text"
                placeholder="Send a message."
                spellCheck="false"
                value={isResponseLoading ? "Processing..." : text}
                onChange={(e) => setText(e.target.value)}
                readOnly={isResponseLoading}
              />
              {!isResponseLoading && (
                <button type="submit">
                  <BiSend size={20} />
                </button>
              )}
            </form>
            <p>
              FinGPT can make mistakes. Consider checking important
              information.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}

export default App;

