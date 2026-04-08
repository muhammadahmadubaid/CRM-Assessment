import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
export declare class NotesController {
    private readonly notesService;
    constructor(notesService: NotesService);
    list(id: string, user: CurrentUserPayload): Promise<import("./note.entity").Note[]>;
    create(id: string, dto: CreateNoteDto, user: CurrentUserPayload): Promise<import("./note.entity").Note | null>;
}
