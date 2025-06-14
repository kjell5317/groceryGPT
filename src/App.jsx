// src/App.js
import React, { useState, useEffect } from "react";
import socket from "./socket";
import "./index.css";
import Item from "./components/Item";

function App() {
  const [shoppingItems, setShoppingItems] = useState({});
  const [stockItems, setStockItems] = useState({});
  const [categories, setCategories] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    socket.on("item", (id, name, tag) => {
      setShoppingItems({
        ...shoppingItems,
        [id]: { name: name, tag: tag, animate: false },
      });
      setCategories((prevCategories) => {
        if (!prevCategories.includes(tag)) {
          return [...prevCategories, tag];
        }
      });
      setErrorMessage("");
    });

    socket.on("shift", (id, name, tag) => {
      console.log(`Received shift: ${id}, ${name}, ${tag}`);
      setStockItems({ ...stockItems, [id]: { name, tag, animate: false } });
      setCategories((prevCategories) => {
        if (!prevCategories.includes(tag)) {
          return [...prevCategories, tag];
        }
      });
      setErrorMessage("");
    });

    socket.on("fs", (id) => {
      if (shoppingItems[id]) {
        const { [id]: _, ...obj } = shoppingItems;
        setShoppingItems(obj);
        setStockItems({ ...stockItems, _ });
      }
    });

    socket.on("fd", (id) => {
      if (stockItems[id]) {
        const { [id]: _, obj } = stockItems;
        setStockItems(obj);
      }
    });

    socket.on("error", (msg) => {
      setErrorMessage(msg);
      const timer = setTimeout(() => {
        setErrorMessage("");
      }, 5000);
      return () => clearTimeout(timer);
    });

    return () => {
      // Clean up socket listeners on component unmount
      socket.off("item");
      socket.off("shift");
      socket.off("fs");
      socket.off("fd");
      socket.off("error");
    };
  }, []);

  const setAnimation = (id, state) => {
    if (shoppingItems[id]) {
      const obj1 = { ...shoppingItems };
      obj1[id].animate = state;
      setShoppingItems(obj1);
    } else if (stockItems[id]) {
      const obj2 = { ...stockItems };
      obj2[id].animate = state;
      setStockItems(obj2);
    }
  };

  const handleClick = (e) => {
    e.preventDefault();
    setAnimation(e.currentTarget.id.replace("li-", ""), true);
  };

  const handleAnimationEnd = (e) => {
    e.preventDefault();
    const id = e.target.id.replace("path-", "");
    setTimeout(() => {
      setAnimation(id, false);
      if (stockItems[id]) {
        const { [id]: _, obj } = stockItems;
        setStockItems(obj);
        socket.emit("delete", id);
      } else if (shoppingItems[id]) {
        const { [id]: _, obj } = shoppingItems;
        setShoppingItems(obj);
        socket.emit("shift", id);
        setStockItems({ ...stockItems, _ });
      }
      console.log(shoppingItems, stockItems);
    }, 200);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.value) {
      socket.emit("item", inputValue.trim());
      setInputValue("");
    }
    setShoppingItems({
      ...shoppingItems,
      id: { name: input.value, tag: "obst", animate: false },
    });
    setCategories((prevCategories) => {
      if (!prevCategories.includes("obst")) {
        return [...prevCategories, "obst"];
      }
    });
  };

  return (
    <div id="wrap">
      <form id="form" onSubmit={handleSubmit}>
        <input
          id="input"
          autoComplete="off"
          placeholder="Hinzufügen"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <button>+</button>
      </form>
      <p id="error">{errorMessage}</p>
      <>
        {Object.keys(shoppingItems).length > 0 && (
          <>
            <h2>Einkaufen</h2>
            <ul>
              {categories.map((category) => (
                <li key={category}>
                  <ul id={`sh-${category}`}>
                    {Object.keys(shoppingItems)
                      .filter((key) => shoppingItems[key].tag === category)
                      .map((key) => {
                        return (
                          <Item
                            id={key}
                            name={shoppingItems[key].name}
                            tag={shoppingItems[key].tag}
                            handleAnimationEnd={handleAnimationEnd}
                            handleClick={handleClick}
                            animate={shoppingItems[key].animate}
                          />
                        );
                      })}
                  </ul>
                </li>
              ))}
            </ul>
          </>
        )}
      </>
      <>
        {Object.keys(stockItems).length > 0 && (
          <>
            <h2>Einkaufen</h2>
            <ul>
              {categories.map((category) => (
                <li>
                  <ul id={`st-${category}`}>
                    {Object.keys(stockItems)
                      .filter((key) => stockItems[key].tag === category)
                      .map((key) => {
                        return (
                          <Item
                            id={key}
                            name={stockItems[key].name}
                            tag={stockItems[key].tag}
                            handleAnimationEnd={handleAnimationEnd}
                            handleClick={handleClick}
                            animate={stockItems[key].animate}
                          />
                        );
                      })}
                  </ul>
                </li>
              ))}
            </ul>
          </>
        )}
      </>
    </div>
  );
}

export default App;
