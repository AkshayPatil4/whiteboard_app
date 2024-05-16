import { Component, ViewChild, ElementRef, AfterViewInit, Input, HostListener , Renderer2, Output, EventEmitter } from '@angular/core';
import { WhiteboardService } from '../whiteboard.service';
import { WhiteboardDataService } from '../whiteboard-data.service';
interface Shape {
  type: string; // 'pen', 'rectangle', 'circle', 'line', 'eraser', 'text'
  startX: number;
  startY: number;
  endX?: number;
  endY?: number;
  points?: { x: number, y: number }[]; // For pen and eraser strokes
  width?: number;
  height?: number;
  radius?: number;
  color: string;
  thickness: number; // Thickness for each shape
  fillStyle?: string;
  lineStyle?: string; // For line dash style (solid, dashed, dotted)
  text?: string;      // Text content for text shapes
  font?: string;      // Font for text shapes
}

@Component({
  selector: 'app-drawing-board',
  templateUrl: './drawing-board.component.html',
  styleUrls: ['./drawing-board.component.css']
})
export class DrawingBoardComponent implements AfterViewInit {

  constructor(private renderer: Renderer2, private whiteboardDataService: WhiteboardDataService) {}

  @ViewChild('whiteboardCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() penThickness: number = 1;
  @Input() penColor: string = '#000000';
  @Input() eraserSize: number = 40; // Default eraser thickness
  @Input() lineStyle: string = 'solid'; // Input for line style
  @Output() dataLoaded = new EventEmitter<Shape[]>();
  
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;
  private currentX = 0;
  private currentY = 0;

  selectedTool: string = 'pen';
  private shapes: Shape[] = [];
  private history: Shape[][] = []; // Array to store history of shapes
  private currentIndex: number = -1;
  private isTextToolActive = false;
  private textInput: HTMLInputElement | null = null;
  private isTextInputActive = false;
  private textShape: Shape | null = null; // Define textShape property

  ngAfterViewInit(): void {
    this.canvas = this.canvasRef.nativeElement;
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    this.ctx.lineCap = 'round';
    this.ctx.lineWidth = this.penThickness;
    this.ctx.strokeStyle = this.penColor;
    this.dataLoaded.emit(this.getWhiteboardData());
    this.whiteboardDataService.updateWhiteboardData(this.getWhiteboardData());
    this.resizeCanvas();
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.resizeCanvas();
  }
  updateWhiteboardData() {
    // Call this method whenever the whiteboard data changes
    this.whiteboardDataService.updateWhiteboardData(this.getWhiteboardData());
  }
  resizeCanvas() {
    const whiteboard = this.canvasRef.nativeElement.parentElement as HTMLElement;
    this.canvas.width = whiteboard.offsetWidth;
    this.canvas.height = whiteboard.offsetHeight;

    // Redraw after resizing
    this.redrawCanvas();
  }

  startDrawing(e: MouseEvent) {
    this.isDrawing = true;
    this.currentX = e.offsetX;
    this.currentY = e.offsetY;

    const defaultThickness = this.selectedTool === 'pen' ? this.penThickness : 2;

    this.shapes.push({
      type: this.selectedTool,
      startX: this.currentX,
      startY: this.currentY,
      color: this.selectedTool === 'eraser' ? '#ffffff' : this.penColor,
      lineStyle: this.selectedTool === 'line' ? this.lineStyle : undefined,
      thickness: defaultThickness,
      points: []
    });
    console.log("Shape added:", this.shapes);
    if (this.selectedTool === 'text') {
      this.startText(e); // Handle text input separately
    } else if (this.selectedTool === 'pen' || this.selectedTool === 'eraser') {
      this.ctx.beginPath();
      this.ctx.moveTo(this.currentX, this.currentY);
    }

    // Set globalCompositeOperation based on selectedTool
    this.ctx.globalCompositeOperation = this.selectedTool === 'eraser' ? 'destination-out' : 'source-over';

    // Clear redo history if drawing after undo
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // Push a copy of the current shapes to history
    this.history.push([...this.shapes]);
    this.currentIndex++;
    this.updateWhiteboardData();
  }


  draw(e: MouseEvent) {
    if (!this.isDrawing) return;

    const currentShape = this.shapes[this.shapes.length - 1];
    currentShape.endX = e.offsetX;
    currentShape.endY = e.offsetY;

    if (currentShape.type === 'pen' || currentShape.type === 'eraser') {
      currentShape.points!.push({ x: e.offsetX, y: e.offsetY });
      this.ctx.lineTo(e.offsetX, e.offsetY);
      this.ctx.stroke();
    } else {
      this.redrawCanvas(); // Redraw for live preview
    }
    this.updateWhiteboardData();
  }

  stopDrawing(e: MouseEvent) {
    this.isDrawing = false;
  }

  private startText(e: MouseEvent) {
    this.isTextToolActive = true;
  
    // Create input element for text (use Renderer2 to avoid SSR issues)
    this.textInput = this.renderer.createElement('input');
  
    // Apply styling to the input element before appending to the DOM
    this.renderer.setAttribute(this.textInput, 'type', 'text');
    this.renderer.setStyle(this.textInput, 'position', 'absolute');
    const inputX = e.clientX;
    const inputY = e.clientY;
    this.renderer.setStyle(this.textInput, 'left', `${inputX}px`);
    this.renderer.setStyle(this.textInput, 'top', `${inputY}px`);
    
    const canvasContainer = this.canvasRef.nativeElement.parentElement;
    this.renderer.appendChild(canvasContainer, this.textInput); // Append to canvas container

    // Now that it's in the DOM, we can safely focus and add event listeners
    this.textInput?.focus();
  
    this.textInput?.addEventListener('blur', () => this.saveText(e)); // Capture the MouseEvent
    this.textInput?.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        this.saveText(); // No need to pass the event here
      }
    });
    this.updateWhiteboardData();
  }
  

  private handleTextInput(e: MouseEvent) {
    if (this.textInput) {
      const text = this.textInput.value;
      this.shapes.push({
        type: 'text',
        startX: this.textInput.offsetLeft + 4, // Adjust for input padding
        startY: this.textInput.offsetTop + 4,
        color: this.penColor,
        thickness: this.penThickness,
        font: '16px sans-serif',
        text: text
      });

      this.renderer.removeChild(document.body, this.textInput);
      this.textInput = null;
      this.isTextInputActive = false;
      this.redrawCanvas();
    }
  }

  private saveText(e?: MouseEvent) {
    if (this.textInput && this.textShape) { // Check if textInput and textShape are not null
      const text = this.textInput.value;
      const textMetrics = this.ctx.measureText(text); // Measure the width of the text
  
      // Adjust text box size based on text content width and padding
      const textBoxWidth = textMetrics.width + 8; // Add padding
      const textBoxHeight = 24; // Fixed height for single-line text input (adjust as needed)
  
      // Update the startX and startY of the text shape to match the text box position
      this.textShape.startX = this.textInput.offsetLeft;
      this.textShape.startY = this.textInput.offsetTop;
  
      // Update the width and height of the text shape to match the text box size
      this.textShape.width = textBoxWidth;
      this.textShape.height = textBoxHeight; // Set the height based on the text box size
  
      this.shapes.push({
        type: 'text',
        startX: this.textInput.offsetLeft + 4, // Adjust for input padding
        startY: this.textInput.offsetTop + 4,
        color: this.penColor,
        thickness: this.penThickness,
        font: '16px sans-serif',
        text: text,
        width: textBoxWidth,
        height: textBoxHeight // Set the height based on the text box size
      });
  
      this.renderer.removeChild(document.body, this.textInput);
      this.textInput = null;
      this.isTextInputActive = false;
      this.redrawCanvas();
    } else {
      console.error('textInput or textShape is null.');
    }
  }
  
  
  

  onPenThicknessChanged(thickness: number) {
    this.penThickness = thickness;
    // Update lineWidth only if the current tool is pen or eraser
    if (this.selectedTool === 'pen' ) {
      this.ctx.lineWidth = thickness;
    }
  }

  onPenColorChanged(color: string) {
    this.penColor = color;
  }

  onEraserSizeChanged(size: number) {
    this.eraserSize = size;
    if (this.selectedTool === 'eraser') {
      this.ctx.lineWidth = 40;
      this.canvas.style.cursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="none" stroke="black"/></svg>') ${size / 2} ${size / 2}, auto`;
    }
  }

  onToolSelected(tool: string) {
    this.selectedTool = tool;

    // Reset globalCompositeOperation and line properties when switching tools
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.strokeStyle = this.penColor;
    // Don't change lineWidth for eraser, it's controlled by eraserSize
    if (tool !== 'eraser') {
      this.ctx.lineWidth = this.penThickness;
    }

    // Change cursor based on tool
    if (tool === 'eraser') {
      this.renderer.setStyle(this.canvas, 'cursor', `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${this.eraserSize}" height="${this.eraserSize}"><circle cx="${this.eraserSize / 2}" cy="${this.eraserSize / 2}" r="${this.eraserSize / 2 - 2}" fill="none" stroke="black"/></svg>') ${this.eraserSize / 2} ${this.eraserSize / 2}, auto`);
    } else if (tool === 'text') {
      this.renderer.setStyle(this.canvas, 'cursor', 'text'); // I-beam cursor for text
    } else {
      this.renderer.setStyle(this.canvas, 'cursor', 'crosshair');
    }
  }

  undo() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.shapes = [...this.history[this.currentIndex]];
  
      // Remove the latest text shape from the shapes array
      const lastTextIndex = this.shapes.findIndex(shape => shape.type === 'text');
      if (lastTextIndex !== -1) {
        this.shapes.splice(lastTextIndex, 1);
      }
  
      // Remove all text input elements if they exist and are children of the canvas parent
      if (this.canvas.parentElement) {
        const textInputs = this.canvas.parentElement.querySelectorAll('input[type="text"]');
        textInputs.forEach(textInput => {
          this.renderer.removeChild(this.canvas.parentElement, textInput);
        });
      }
      this.textInput = null;
      this.isTextInputActive = false;
  
      // Clear the canvas before redrawing to avoid issues with eraser strokes
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  
      this.redrawCanvas();
    }
  }
  
  redo() {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      this.shapes = [...this.history[this.currentIndex]];
  
      // Remove the latest text shape from the shapes array
      const lastTextIndex = this.shapes.findIndex(shape => shape.type === 'text');
      if (lastTextIndex !== -1) {
        this.shapes.splice(lastTextIndex, 1);
      }
  
      // Remove all text input elements if they exist and are children of the canvas parent
      if (this.canvas.parentElement) {
        const textInputs = this.canvas.parentElement.querySelectorAll('input[type="text"]');
        textInputs.forEach(textInput => {
          this.renderer.removeChild(this.canvas.parentElement, textInput);
        });
      }
      this.textInput = null;
      this.isTextInputActive = false;
  
      // Clear the canvas before redrawing to avoid issues with eraser strokes
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  
      this.redrawCanvas();
    }
  }
  
  clearCanvas() {
    // Remove the text input element if it exists and is a child of the canvas parent
    if (this.textInput && this.textInput.parentElement === this.canvas.parentElement) {
      this.renderer.removeChild(this.canvas.parentElement, this.textInput);
      this.textInput = null;
      this.isTextInputActive = false;
    }
  
    // Clear the canvas and reset other properties
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.shapes = []; // Clear shapes array
    this.history = []; // Clear history array
    this.currentIndex = -1;
  }
  
  

  redrawCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = 0; i < this.shapes.length; i++) {
      const shape = this.shapes[i];

      this.ctx.strokeStyle = shape.color;
      this.ctx.lineWidth = shape.thickness;

      // Set line style for 'line' shapes
      if (shape.type === 'line') {
        if (shape.lineStyle === 'arrow') {
          this.drawArrow(shape.startX, shape.startY, shape.endX!, shape.endY!);
        }
        this.ctx.setLineDash(
          shape.lineStyle === 'dashed' ? [5, 5] : shape.lineStyle === 'dotted' ? [1, 5] : []
        );
      } else {
        this.ctx.setLineDash([]);
      }

      this.ctx.beginPath();

      if (shape.type === 'pen' || shape.type === 'eraser') {
        if (shape.points && shape.points.length > 0) {
          this.ctx.moveTo(shape.points[0].x, shape.points[0].y);
          for (let j = 1; j < shape.points.length; j++) {
            this.ctx.lineTo(shape.points[j].x, shape.points[j].y);
          }
        }
      } else if (shape.type === 'rectangle') {
        this.ctx.rect(shape.startX, shape.startY, shape.endX! - shape.startX, shape.endY! - shape.startY);
        if (shape.fillStyle) {
          this.ctx.fillStyle = shape.fillStyle;
          this.ctx.fill();
        }
      } else if (shape.type === 'circle') {
        const radius = Math.hypot(shape.endX! - shape.startX, shape.endY! - shape.startY);
        this.ctx.arc(shape.startX, shape.startY, radius, 0, 2 * Math.PI);
        if (shape.fillStyle) {
          this.ctx.fillStyle = shape.fillStyle;
          this.ctx.fill();
        }
      } else if (shape.type === 'line') {
        this.ctx.moveTo(shape.startX, shape.startY);
        this.ctx.lineTo(shape.endX!, shape.endY!);
      } else if (shape.type === 'text' && shape.text) {
        this.ctx.font = shape.font || '16px sans-serif';
        this.ctx.fillText(shape.text, shape.startX, shape.startY);
      }

      this.ctx.stroke();
    }
  }
  drawArrow(startX: number, startY: number, endX: number, endY: number) {
  const arrowSize = 10; // Adjust the size of the arrowhead as needed

  // Draw the main line
  this.ctx.moveTo(startX, startY);
  this.ctx.lineTo(endX, endY);

  // Calculate the angle of the line
  const angle = Math.atan2(endY - startY, endX - startX);

  // Calculate the coordinates of the arrowhead
  const x1 = endX - arrowSize * Math.cos(angle - Math.PI / 6);
  const y1 = endY - arrowSize * Math.sin(angle - Math.PI / 6);
  const x2 = endX - arrowSize * Math.cos(angle + Math.PI / 6);
  const y2 = endY - arrowSize * Math.sin(angle + Math.PI / 6);

  // Draw the lines of the arrowhead
  this.ctx.moveTo(endX, endY);
  this.ctx.lineTo(x1, y1);
  this.ctx.moveTo(endX, endY);
  this.ctx.lineTo(x2, y2);

  // Stroke the arrowhead lines to render them on the canvas
  this.ctx.stroke();
}
  downloadImage() {
    const link = document.createElement('a');
    link.download = 'whiteboard.png';
    link.href = this.canvas.toDataURL();
    link.click();
  }


getWhiteboardData(): Shape[] {
  return this.shapes; 

}

}