import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthShell } from '../auth-shell/auth-shell';
import { GoogleButton } from '../google-button/google-button';

@Component({
  selector: 'app-sign-up',
  imports: [RouterLink, AuthShell, GoogleButton],
  templateUrl: './sign-up.html',
})
export class SignUp {}
