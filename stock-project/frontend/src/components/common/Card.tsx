import styles from './Card.module.css';
import clsx from 'clsx';

interface Props {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export default function Card({ children, className, onClick, hoverable }: Props) {
  return (
    <div
      className={clsx(styles.card, hoverable && styles.hoverable, className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
