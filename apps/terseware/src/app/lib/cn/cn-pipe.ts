import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import type { ClassValue } from 'clsx';
import { cn } from './cn';

@Pipe({ name: 'cn' })
export class CnPipe implements PipeTransform {
  transform(value: ClassValue[]): string {
    return cn(value);
  }
}
