

import { Bloghandlers } from 'src/api/blog/blogdata';
import { NotesHandlers } from 'src/api/notes/notedata';
import { TicketHandlers } from 'src/api/ticket/ticket-data';
import { itcareHandlers } from 'src/api/itcare/data';


export const mockHandlers = [
  ...itcareHandlers,
  ...Bloghandlers,
  ...NotesHandlers,
  ...TicketHandlers,
];
