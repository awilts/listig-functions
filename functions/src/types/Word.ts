import { CardColor } from './CardColor'

export type Word = {
    id?: string
    text: string
    boardId: number
    color: CardColor
}
