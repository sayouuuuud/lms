export type ChatMessage = {
  id: string
  fromMe: boolean
  text: string
  time: string
}

export type TicketStatus = 'open' | 'closed'

// Student-side view of a support ticket. The only contact is the teacher
// (أ. عبد السلام) — students can't message anyone else.
export type Conversation = {
  /** ticket code */
  id: string
  /** teacher display name */
  name: string
  /** teacher role label */
  role: string
  initials: string
  avatar?: string
  /** ticket subject */
  subject: string
  /** ticket lifecycle status */
  status: TicketStatus
  /** relative time label of last activity */
  lastTime: string
  /** replies from the teacher the student hasn't read yet */
  unread: number
  messages: ChatMessage[]
}
