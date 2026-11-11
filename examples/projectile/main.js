// 예제 4 시작 파일: 이 폴더의 화면 틀(app.js)에 이 폴더의 내용(lesson.js)을 넘긴다.
import '../../style.css';
import './projectile.css';
import { startLab } from './app.js';
import * as lesson from './lesson.js';

startLab(lesson);
