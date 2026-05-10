import styles from './Card.module.css';
import clsx from 'clsx';
import React from 'react';

interface Props {
    title?: string;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
    hoverable?: boolean;
}

export default function Card({ title, children, className, style, onClick, hoverable }: Props) {
    return (
        <div
            className={clsx(styles.card, hoverable && styles.hoverable, className)}
            style={style}
            onClick={onClick}
        >
            {title && (
                <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{title}</h3>
                </div>
            )}
            <div className={styles.cardContent}>
                {children}
            </div>
        </div>
    );
}