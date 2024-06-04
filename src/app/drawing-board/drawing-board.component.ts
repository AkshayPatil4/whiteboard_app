import {
  Component,
  ViewChild,
  ElementRef,
  AfterViewInit,
  Input,
  HostListener,
  Renderer2,
  Output,
  EventEmitter,
} from '@angular/core';
import { WhiteboardDataService } from '../whiteboard-data.service';

interface Shape {
  type: string; // 'pen', 'rectangle', 'circle', 'line', 'eraser', 'text'
  startX: number;
  startY: number;
  endX?: number;
  endY?: number;
  points?: { x: number; y: number }[]; // For pen and eraser strokes
  width?: number;
  height?: number;
  radius?: number;
  color: string;
  thickness: number; // Thickness for each shape
  fillStyle?: string;
  lineStyle?: string; // For line dash style (solid, dashed, dotted)
  text?: string; // Text content for text shapes
  font?: string; // Font for text shapes
  innerCircleRadius?: number;
}

@Component({
  selector: 'app-drawing-board',
  templateUrl: './drawing-board.component.html',
  styleUrls: ['./drawing-board.component.css'],
})
export class DrawingBoardComponent implements AfterViewInit {
  constructor(
    private renderer: Renderer2,
    private whiteboardDataService: WhiteboardDataService
  ) {}

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

  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private selectedShape: Shape | null = null;

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
    this.whiteboardDataService.updateWhiteboardData(this.getWhiteboardData());
  }

  resizeCanvas() {
    const whiteboard = this.canvasRef.nativeElement
      .parentElement as HTMLElement;
    this.canvas.width = whiteboard.offsetWidth;
    this.canvas.height = whiteboard.offsetHeight;
    this.redrawCanvas();
  }

  startDragging() {
    this.isDragging = true;
    this.renderer.setStyle(this.canvas, 'cursor', 'grabbing');
  }

  stopDragging() {
    this.isDragging = false;
    this.renderer.setStyle(this.canvas, 'cursor', 'crosshair');
  }

  // Add event listeners for mouse dragging
  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent) {
    if (event.button === 0) {
      // Left mouse button
      this.startDragging();
    }
  }

  @HostListener('mouseup', ['$event'])
  onMouseUp(event: MouseEvent) {
    if (event.button === 0) {
      // Left mouse button
      this.stopDragging();
    }
  }

  startDrawing(e: MouseEvent) {
    const mousePos = this.getMousePos(e);
    this.selectedShape = this.getShapeAtPosition(mousePos);

    if (this.selectedShape) {
      this.isDragging = true;
      this.dragStart = mousePos;
    } else {
      this.isDrawing = true;
      this.currentX = e.offsetX;
      this.currentY = e.offsetY;

      const defaultThickness =
        this.selectedTool === 'pen' ? this.penThickness : 2;

      this.shapes.push({
        type: this.selectedTool,
        startX: this.currentX,
        startY: this.currentY,
        color: this.selectedTool === 'eraser' ? '#ffffff' : this.penColor,
        lineStyle: this.selectedTool === 'line' ? this.lineStyle : undefined,
        thickness: defaultThickness,
        points: [],
      });
      console.log('Shape added:', this.shapes);
      if (this.selectedTool === 'text') {
        this.startText(e);
      } else if (
        this.selectedTool === 'pen' ||
        this.selectedTool === 'eraser'
      ) {
        this.ctx.beginPath();
        this.ctx.moveTo(this.currentX, this.currentY);
      }

      this.ctx.globalCompositeOperation =
        this.selectedTool === 'eraser' ? 'destination-out' : 'source-over';

      if (this.currentIndex < this.history.length - 1) {
        this.history = this.history.slice(0, this.currentIndex + 1);
      }

      this.history.push([...this.shapes]);
      this.currentIndex++;
      this.updateWhiteboardData();
    }
  }

  drawArrow(fromX: number, fromY: number, toX: number, toY: number) {
    const headLength = 10; // Length of the arrow head
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);

    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(toX, toY);
    this.ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.lineTo(toX, toY);
    this.ctx.closePath();
    this.ctx.fillStyle = this.penColor;
    this.ctx.fill();
  }

  draw(e: MouseEvent) {
    if (this.isDragging && this.selectedShape) {
      const mousePos = this.getMousePos(e);
      const dx = mousePos.x - this.dragStart.x;
      const dy = mousePos.y - this.dragStart.y;

      this.moveShape(this.selectedShape, dx, dy);
      this.dragStart = mousePos;
      this.redrawCanvas();
    } else if (this.isDrawing) {
      const currentShape = this.shapes[this.shapes.length - 1];
      currentShape.endX = e.offsetX;
      currentShape.endY = e.offsetY;

      if (currentShape.type === 'pen' || currentShape.type === 'eraser') {
        currentShape.points!.push({ x: e.offsetX, y: e.offsetY });
        this.ctx.lineTo(e.offsetX, e.offsetY);
        this.ctx.stroke();
      } else if (
        currentShape.type === 'startEvent' ||
        currentShape.type === 'endEvent'
      ) {
        // Calculate the radius and store in currentShape
        const radius = Math.hypot(
          currentShape.endX - currentShape.startX,
          currentShape.endY - currentShape.startY
        );
        currentShape.radius = radius;

        this.redrawCanvas();
      } else if (currentShape.type === 'gateway') {
        const width = currentShape.endX - currentShape.startX;
        const height = currentShape.endY - currentShape.startY;

        currentShape.width = width;
        currentShape.height = height;

        this.redrawCanvas();
      } else if (currentShape.type === 'task') {
        const width = currentShape.endX - currentShape.startX;
        const height = currentShape.endY - currentShape.startY;

        currentShape.width = width;
        currentShape.height = height;

        this.redrawCanvas();
      } else {
        this.redrawCanvas();
      }
      this.updateWhiteboardData();
    }
  }

  stopDrawing(e: MouseEvent) {
    this.isDrawing = false;
    this.isDragging = false;
    this.selectedShape = null;
  }

  startText(e: MouseEvent) {
    this.isTextToolActive = true;
    const canvasContainer = this.canvasRef.nativeElement.parentElement;

    // Create input element for text
    this.textInput = this.renderer.createElement('input');
    this.renderer.setAttribute(this.textInput, 'type', 'text');
    this.renderer.setStyle(this.textInput, 'position', 'absolute');
    this.renderer.setStyle(this.textInput, 'left', `${e.clientX}px`);
    this.renderer.setStyle(this.textInput, 'top', `${e.clientY}px`);
    this.renderer.appendChild(canvasContainer, this.textInput);

    // Focus the input element and add event listeners
    if (this.textInput) {
      this.textInput.focus();
      this.textInput.addEventListener('blur', () => this.saveText());
      this.textInput.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter') {
          this.saveText();
        }
      });
    }
  }

  private handleTextInput(e: MouseEvent) {
    if (this.textInput) {
      const text = this.textInput.value;
      this.shapes.push({
        type: 'text',
        startX: this.textInput.offsetLeft + 4,
        startY: this.textInput.offsetTop + 4,
        color: this.penColor,
        thickness: this.penThickness,
        font: '16px sans-serif',
        text: text,
      });

      this.renderer.removeChild(document.body, this.textInput);
      this.textInput = null;
      this.isTextInputActive = false;
      this.redrawCanvas();
    }
  }

  private saveText() {
    if (this.textInput && this.textInput.value.trim() !== '') {
      const text = this.textInput.value;
      const startX = this.textInput.offsetLeft;
      const startY = this.textInput.offsetTop;
      const textMetrics = this.ctx.measureText(text);
      const width = textMetrics.width + 8; // Add padding
      const height = 24; // Fixed height for single-line text input (adjust as needed)

      // Create text shape
      this.textShape = {
        type: 'text',
        startX: startX,
        startY: startY,
        color: this.penColor,
        thickness: this.penThickness,
        font: '16px sans-serif',
        text: text,
        width: width,
        height: height,
      };

      // Remove text input and redraw canvas
      if (this.textInput.parentElement) {
        this.renderer.removeChild(
          this.canvasRef.nativeElement.parentElement,
          this.textInput
        );
      }
      this.textInput = null;
      this.redrawCanvas();
    }
    this.isTextToolActive = false;
  }

  drawText() {
    if (this.textShape) {
      // Draw text shape on canvas
      this.ctx.fillStyle = this.textShape.color;
      if (this.textShape.font) {
        // Perform null check for font
        this.ctx.font = this.textShape.font;
      }
      if (this.textShape.text) {
        // Perform null check for text
        this.ctx.fillText(
          this.textShape.text,
          this.textShape.startX,
          this.textShape.startY
        );
      }
    }
  }

  onPenThicknessChanged(thickness: number) {
    this.penThickness = thickness;
    if (this.selectedTool === 'pen') {
      this.ctx.lineWidth = thickness;
    }
  }

  undo() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.shapes = [...this.history[this.currentIndex]];
      this.redrawCanvas();
      this.updateWhiteboardData();
    }
  }

  redo() {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      this.shapes = [...this.history[this.currentIndex]];
      this.redrawCanvas();
      this.updateWhiteboardData();
    }
  }

  clearCanvas() {
    this.shapes = [];
    this.history = [];
    this.currentIndex = -1;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.updateWhiteboardData();
  }

  private getMousePos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private redrawCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const shape of this.shapes) {
      this.ctx.strokeStyle = shape.color;
      this.ctx.lineWidth = shape.thickness;
      this.ctx.setLineDash(
        shape.lineStyle === 'dashed'
          ? [5, 5]
          : shape.lineStyle === 'dotted'
          ? [2, 2]
          : []
      );

      switch (shape.type) {
        case 'pen':
          this.ctx.beginPath();
          if (shape.points && shape.points.length > 0) {
            this.ctx.moveTo(shape.points[0].x, shape.points[0].y);
            for (const point of shape.points) {
              this.ctx.lineTo(point.x, point.y);
            }
            this.ctx.stroke();
          }
          break;
        case 'rectangle':
          this.ctx.strokeRect(
            shape.startX,
            shape.startY,
            shape.endX! - shape.startX,
            shape.endY! - shape.startY
          );
          break;
        case 'circle':
          const radius = Math.sqrt(
            Math.pow(shape.endX! - shape.startX, 2) +
              Math.pow(shape.endY! - shape.startY, 2)
          );
          this.ctx.beginPath();
          this.ctx.arc(shape.startX, shape.startY, radius, 0, 2 * Math.PI);
          this.ctx.stroke();
          break;
        case 'line':
          this.ctx.beginPath();
          if (shape.endX && shape.endY) {
            if (shape.lineStyle === 'arrow') {
              this.drawArrow(
                shape.startX,
                shape.startY,
                shape.endX,
                shape.endY
              );
            } else {
              this.ctx.moveTo(shape.startX, shape.startY);
              this.ctx.lineTo(shape.endX, shape.endY);
              this.ctx.stroke();
            }
          }
          break;
        case 'text':
          this.ctx.font = shape.font || '16px sans-serif';
          this.ctx.fillStyle = shape.color;
          this.ctx.fillText(shape.text || '', shape.startX, shape.startY + 16);
          break;
        case 'eraser':
          this.ctx.strokeStyle = '#ffffff';
          this.ctx.lineWidth = this.eraserSize;
          if (shape.points && shape.points.length > 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(shape.points[0].x, shape.points[0].y);
            for (const point of shape.points) {
              this.ctx.lineTo(point.x, point.y);
            }
            this.ctx.stroke();
          }
          break;
        case 'startEvent': {
          const radius = shape.radius!;
          this.ctx.beginPath(); // Start a new path for the outer circle
          this.ctx.arc(shape.startX, shape.startY, radius, 0, 2 * Math.PI);
          this.ctx.stroke(); // Stroke the outer circle

          this.ctx.beginPath(); // Start a new path for the inner circle
          this.ctx.arc(
            shape.startX,
            shape.startY,
            radius * 0.6,
            0,
            2 * Math.PI
          );

          break;
        }

        // End Event
        case 'endEvent': {
          const radius = shape.radius!;
          this.ctx.beginPath(); // Start a new path for the outer circle
          this.ctx.arc(shape.startX, shape.startY, radius, 0, 2 * Math.PI);
          this.ctx.stroke(); // Stroke the outer circle

          this.ctx.beginPath(); // Start a new path for the inner circle
          this.ctx.arc(
            shape.startX,
            shape.startY,
            radius * 0.6,
            0,
            2 * Math.PI
          );
          this.ctx.fillStyle = 'black';
          this.ctx.fill(); // Fill the inner circle
          break;
        }

        // Task (Rounded Rectangle)

        // Gateway (Diamond)
        case 'gateway': {
          this.ctx.beginPath();
          this.ctx.moveTo(shape.startX + shape.width! / 2, shape.startY);
          this.ctx.lineTo(
            shape.startX + shape.width!,
            shape.startY + shape.height! / 2
          );
          this.ctx.lineTo(
            shape.startX + shape.width! / 2,
            shape.startY + shape.height!
          );
          this.ctx.lineTo(shape.startX, shape.startY + shape.height! / 2);
          this.ctx.closePath();
          break;
        }

        case 'task':
          this.ctx.beginPath();
          const rectRadius = 10; // Adjust for roundness
          this.ctx.roundRect(
            shape.startX,
            shape.startY,
            shape.width!,
            shape.height!,
            rectRadius
          ); // Rounded rectangle
          break;
      }
      this.ctx.stroke();

      // Fill shapes only if fillStyle is set
      if (shape.fillStyle) {
        this.ctx.fillStyle = shape.fillStyle;
        this.ctx.fill();
      }
    }
    this.updateWhiteboardData();
  }

  private moveShape(shape: Shape, dx: number, dy: number) {
    shape.startX += dx;
    shape.startY += dy;
    if (shape.endX !== undefined) shape.endX += dx;
    if (shape.endY !== undefined) shape.endY += dy;
    if (shape.points) {
      shape.points = shape.points.map((point) => ({
        x: point.x + dx,
        y: point.y + dy,
      }));
    }
  }

  private getShapeAtPosition(pos: { x: number; y: number }): Shape | null {
    for (let i = this.shapes.length - 1; i >= 0; i--) {
      const shape = this.shapes[i];
      if (shape.type === 'rectangle' && this.isPointInRect(pos, shape)) {
        return shape;
      } else if (shape.type === 'circle' && this.isPointInCircle(pos, shape)) {
        return shape;
      } else if (shape.type === 'line' && this.isPointOnLine(pos, shape)) {
        return shape;
      } else if (shape.type === 'startEvent' || shape.type === 'endEvent') {
        // Check if the point is within the outer circle of the event shape
        const distanceToCenter = Math.sqrt(
          (pos.x - shape.startX) ** 2 + (pos.y - shape.startY) ** 2
        );
        if (distanceToCenter <= shape.radius!) {
          return shape;
        }
      } else if (shape.type === 'task' && this.isPointInRect(pos, shape)) {
        return shape;
      } else if (shape.type === 'gateway' && this.isPointInRect(pos, shape)) {
        return shape;
      }
    }
    return null;
  }

  private isPointInRect(pos: { x: number; y: number }, shape: Shape): boolean {
    return (
      pos.x >= shape.startX &&
      pos.x <= shape.endX! &&
      pos.y >= shape.startY &&
      pos.y <= shape.endY!
    );
  }

  private isPointInEventShape(
    pos: { x: number; y: number },
    shape: Shape
  ): boolean {
    const dxOuter = pos.x - shape.startX;
    const dyOuter = pos.y - shape.startY;
    const outerRadius = shape.radius!;
    const outerDistance = dxOuter * dxOuter + dyOuter * dyOuter;

    const dxInner = pos.x - shape.startX;
    const dyInner = pos.y - shape.startY;
    const innerRadius = shape.radius! * 0.6; // Inner circle radius is 60% of the outer circle
    const innerDistance = dxInner * dxInner + dyInner * dyInner;

    return (
      outerDistance <= outerRadius * outerRadius &&
      innerDistance >= innerRadius * innerRadius
    );
  }
  private isPointInCircle(
    pos: { x: number; y: number },
    shape: Shape
  ): boolean {
    const dx = pos.x - shape.startX;
    const dy = pos.y - shape.startY;
    const radius = Math.sqrt(
      Math.pow(shape.endX! - shape.startX, 2) +
        Math.pow(shape.endY! - shape.startY, 2)
    );
    return dx * dx + dy * dy <= radius * radius;
  }

  private isPointOnLine(pos: { x: number; y: number }, shape: Shape): boolean {
    const { startX, startY, endX, endY } = shape;
    const d1 = Math.sqrt(
      Math.pow(pos.x - startX, 2) + Math.pow(pos.y - startY, 2)
    );
    const d2 = Math.sqrt(
      Math.pow(pos.x - endX!, 2) + Math.pow(pos.y - endY!, 2)
    );
    const lineLen = Math.sqrt(
      Math.pow(endX! - startX, 2) + Math.pow(endY! - startY, 2)
    );
    const buffer = 0.1;
    return d1 + d2 >= lineLen - buffer && d1 + d2 <= lineLen + buffer;
  }

  private getWhiteboardData(): Shape[] {
    return this.shapes.map((shape) => ({ ...shape }));
  }

  onToolSelected(tool: string) {
    this.selectedTool = tool;
    if (tool === 'eraser') {
      this.renderer.setStyle(
        this.canvas,
        'cursor',
        `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${
          this.eraserSize
        }" height="${this.eraserSize}"><circle cx="${
          this.eraserSize / 2
        }" cy="${this.eraserSize / 2}" r="${
          this.eraserSize / 2 - 2
        }" fill="none" stroke="black"/></svg>') ${this.eraserSize / 2} ${
          this.eraserSize / 2
        }, auto`
      );
    } else if (tool === 'text') {
      this.renderer.setStyle(this.canvas, 'cursor', 'text'); // I-beam cursor for text
    } else {
      this.renderer.setStyle(this.canvas, 'cursor', 'crosshair');
    }
  }

  onPenColorChanged(color: string) {
    this.penColor = color;
    if (this.selectedTool === 'pen') {
      this.ctx.strokeStyle = color;
    }
  }

  onEraserSizeChanged(size: number) {
    this.eraserSize = size;
  }

  downloadImage() {
    const dataUrl = this.canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'whiteboard.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
