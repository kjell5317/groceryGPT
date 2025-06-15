import React, { useState } from "react";
import "../index.css";

function Item({ id, name, tag, handleAnimationEnd, handleClick, animate }) {
  return (
    <li id={`li-${id}`} onClick={handleClick} key={id}>
      <div className="circle">
        <svg viewBox="0 0 24 24">
          <path
            d="M4.1 12.7L9 17.6 20.3 6.3"
            fill="none"
            onAnimationEnd={handleAnimationEnd}
            className={`${animate ? "check" : ""}`}
            id={`path-${id}`}
          />
        </svg>
      </div>
      <span className="name">{name}</span>
      <span className="tag">{tag}</span>
    </li>
  );
}

export default Item;
