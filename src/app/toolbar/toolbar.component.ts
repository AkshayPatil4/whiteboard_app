import { Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
import { WhiteboardService } from '../whiteboard.service';
import { DrawingBoardComponent } from '../drawing-board/drawing-board.component';
@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.css']
})
export class ToolbarComponent {

  constructor(private whiteboardService: WhiteboardService) {}
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
  

  lineStyles = ['solid', 'dashed', 'dotted', 'arrow']; // Available line styles
  selectedLineStyle = this.lineStyles[0];
  @ViewChild('lineStyleDropdown') lineStyleDropdown!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild(DrawingBoardComponent) drawingBoard!: DrawingBoardComponent;
  selectTool(tool: string) {
    this.selectedTool = tool;
    this.toolSelected.emit(tool);
  }
  onToolSelected(tool: string) {
    this.selectedTool = tool;
    this.toolSelected.emit(tool);

    // Toggle dropdown visibility based on selected tool
    if (this.lineStyleDropdown) {
      this.lineStyleDropdown.nativeElement.style.display = tool === 'line' ? 'block' : 'none';
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

  clear(){
    this.clearClicked.emit(); //Emit the clear event when button is clicked
 }
  download() {
    this.downloadClicked.emit();
  }
  saveWhiteboard() {
    const filename = prompt("Enter filename:", "whiteboard.json");
    if (filename) {
      const whiteboardData = this.drawingBoard.getWhiteboardData();
      this.whiteboardService.saveWhiteboard(filename, whiteboardData)
        .subscribe(
          response => {
            // Handle successful save (e.g., show a notification)
            console.log('Whiteboard saved:', response);
          },
          error => {
            // Handle errors (e.g., show an error message)
            console.error('Error saving whiteboard:', error);
          }
        );
    }
  }

  loadWhiteboard(files: FileList | null) {
    if (files && files.length > 0) {
      const file = files[0];
      this.whiteboardService.loadWhiteboard(file)
        .subscribe(
          response => {
            // Handle successful load (e.g., update the drawing board)
            console.log('Whiteboard loaded:', response);
            // Emit an event to the DrawingBoardComponent with the loaded data
          },
          error => {
            // Handle errors (e.g., show an error message)
            console.error('Error loading whiteboard:', error);
          }
        );
    }
  }


}

