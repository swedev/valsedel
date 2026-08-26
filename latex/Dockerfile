# LaTeX compilation container for valsedel PDF generation
# Uses texlive with XeLaTeX for Open Sans font support

FROM debian:bookworm-slim

# Install texlive with XeLaTeX and required packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-xetex \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    texlive-latex-extra \
    texlive-lang-european \
    fonts-open-sans \
    fontconfig \
    && rm -rf /var/lib/apt/lists/* \
    && fc-cache -fv

# Create working directory
WORKDIR /latex

# Copy templates
COPY templates/ /latex/templates/

# Create output directory
RUN mkdir -p /latex/output

# Default command: compile a .tex file
# Usage: docker run -v $(pwd)/output:/latex/output latex-valsedel input.tex
ENTRYPOINT ["xelatex", "-output-directory=/latex/output", "-interaction=nonstopmode"]
