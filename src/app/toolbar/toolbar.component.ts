import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { WhiteboardService } from '../whiteboard.service';
import { DrawingBoardComponent } from '../drawing-board/drawing-board.component';
import { WhiteboardDataService } from '../whiteboard-data.service';
import { WhiteboardLoaderService } from '../WhiteboardLoader.Service';
import { take } from 'rxjs';
interface FileInfo {
  id: string;
  name: string;
}
@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.css'],
})
export class ToolbarComponent implements AfterViewInit, OnInit {
  showFileMenu = false; // To control the visibility of the dropdown
  showOpenModal = false;

  @Output() toolSelected = new EventEmitter<string>();
  @Output() downloadClicked = new EventEmitter<void>();
  @Output() penThicknessChanged = new EventEmitter<number>();
  @Output() penColorChanged = new EventEmitter<string>();
  @Output() eraserSizeChanged = new EventEmitter<number>(); // Define this output property
  @Output() lineStyleChanged = new EventEmitter<string>();
  @Output() undoClicked = new EventEmitter<void>();
  @Output() redoClicked = new EventEmitter<void>();
  @Output() clearClicked = new EventEmitter<void>();
  selectedTool: string = 'pen';
  penThickness: number = 1;
  penColor: string = '#000000';
  eraserSize: number = 50;

  bpmnShapes: string[] = ['endEvent', 'task', 'gateway'];
  lineStyles = ['solid', 'dashed', 'dotted', 'arrow']; // Available line styles
  selectedLineStyle = this.lineStyles[0];
  @ViewChild('lineStyleDropdown') lineStyleDropdown!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild(DrawingBoardComponent) drawingBoard!: DrawingBoardComponent;

  private whiteboardData: any;
  constructor(
    private whiteboardService: WhiteboardService,
    private whiteboardDataService: WhiteboardDataService,
    private whiteboardLoaderService: WhiteboardLoaderService
  ) {}
  files: FileInfo[] = [];
  ngOnInit(): void {
    this.whiteboardService.getWhiteboardFiles().subscribe(
      (data: FileInfo[]) => {
        this.files = data;
      },
      (error) => {
        console.error('Failed to load whiteboard files', error);
      }
    );
  }

  ngAfterViewInit(): void {
    // Wait for the drawing board to be fully initialized
    setTimeout(() => {
      if (this.drawingBoard) {
        // Check if drawingBoard is defined
        this.drawingBoard.dataLoaded.subscribe((data) => {
          this.whiteboardData = data;
        });
      }
    }, 0);
  }

  loadWhiteboard(fileName: string) {
    console.log('File ID to load:', fileName);
    this.whiteboardService.loadWhiteboard(fileName)
      .pipe(take(1)) // Take only the first emission
      .subscribe(
        (response: any) => {
          // Handle successful load
          console.log('Whiteboard loaded:', response);
          this.whiteboardLoaderService.updateWhiteboardData(response);
        },
        (error) => {
          console.error('Error loading whiteboard:', error);
        }
      );
  }
  toggleFileMenu() {
    this.showFileMenu = !this.showFileMenu;
  }

  selectTool(tool: string) {
    this.selectedTool = tool;
    this.toolSelected.emit(tool);
  }
  onToolSelected(tool: string) {
    this.selectedTool = tool;
    this.toolSelected.emit(tool);

    // Toggle dropdown visibility based on selected tool
    if (this.lineStyleDropdown) {
      this.lineStyleDropdown.nativeElement.style.display =
        tool === 'line' ? 'block' : 'none';
    }
  }
  onLineStyleSelected(style: string) {
    if (style === 'arrow') {
      // Handle arrow style selection
      this.lineStyleChanged.emit(style);
      return;
    }
    this.selectedLineStyle = style;
    this.lineStyleChanged.emit(style);
  }
  undo() {
    this.undoClicked.emit();
  }

  redo() {
    this.redoClicked.emit();
  }

  clear() {
    this.clearClicked.emit(); //Emit the clear event when button is clicked
  }
  download() {
    this.downloadClicked.emit();
  }
  saveWhiteboard() {
    const filename = prompt('Enter filename:', 'whiteboard.json');
    if (filename) {
      this.whiteboardDataService.whiteboardData$.subscribe((whiteboardData) => {
        if (whiteboardData) {
          this.whiteboardService
            .saveWhiteboard(filename, whiteboardData)
            .pipe(take(1)).subscribe({
              next: (response) => {
                console.log('Whiteboard saved:', response);
                // Optionally, you can emit an event here to notify other components or show a success message
              },
              error: (error) => {
                console.error('Error saving whiteboard:', error);
                // Handle the error (e.g., show an error message to the user)
              },
            });
          this.whiteboardService
            .saveWhiteboardasimage(filename, whiteboardData)
            .pipe(take(1)).subscribe({
              next: (response) => {
                console.log('Whiteboard saved:', response);
                // Optionally, you can emit an event here to notify other components or show a success message
              },
              error: (error) => {
                console.error('Error saving whiteboard:', error);
                // Handle the error (e.g., show an error message to the user)
              },
            });
        } else {
          console.error('No whiteboard data found.');
        }
      });
    }
  }
}
