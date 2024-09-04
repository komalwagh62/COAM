import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../Service/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  LogInForm!: FormGroup;
  public showPassword: boolean = false;

  constructor(private formBuilder: FormBuilder, private router: Router, private authService: AuthService) { }

  ngOnInit(): void {
    this.LogInForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  public togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onsubmit() {
    if (this.LogInForm.valid) {
      const email = this.LogInForm.get('email')?.value;
      const password = this.LogInForm.get('password')?.value;

      if (this.authService.login(email, password)) {
        this.router.navigate(['']);
      } else {
        // Handle authentication error (show error message, etc.)
      }
    }
  }
}
