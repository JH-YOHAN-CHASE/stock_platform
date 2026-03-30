import styles from './Card.module.css';
import clsx from 'clsx';
import React from 'react'; // CSSProperties 타입을 위해 필요할 수 있습니다.

interface Props {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties; // 👈 1. style 타입 추가
    onClick?: () => void;
    hoverable?: boolean;
}

// 👈 2. 매개변수(Props)에서 style 꺼내오기
export default function Card({ children, className, style, onClick, hoverable }: Props) {
    return (
        <div
            className={clsx(styles.card, hoverable && styles.hoverable, className)}
            style={style} // 👈 3. 실제 div 요소에 style 적용하기
            onClick={onClick}
        >
            {children}
        </div>
    );
}